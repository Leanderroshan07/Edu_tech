# Video Watch Tracking & Teacher Analytics — Full Implementation Spec

## 0. Why most implementations of this go wrong

The typical broken approach: frontend tracks "watch time" itself (e.g. `setInterval` counting up) and just POSTs a final number to the backend. This breaks immediately because:
- Tab switches / laptop sleep keep intervals "running" in background inconsistently
- Seeking forward/backward corrupts the counter
- Multiple tabs/devices double-count
- There's no audit trail — teacher can't see *what actually happened*, only a suspicious final number

**The fix: event sourcing.** The frontend never calculates anything. It just reports raw, timestamped events (`PLAY`, `PAUSE`, `SEEK`, `COMPLETE`, `HEARTBEAT`) to the backend as they happen. The backend is the single source of truth that derives sessions, watch time, gaps, and completion from the event log. This is the only way the numbers are trustworthy and auditable.

Two separate data concerns, stored separately (as you correctly asked for):
1. **`VideoProgress`** — one row per (student, video). Mutable, current-state only. Used to resume playback (`lastPosition`) and for quick completion checks.
2. **`VideoWatchEvent`** — append-only log. Never updated, never deleted. Used to derive sessions/analytics on demand (or via a nightly/on-write aggregation job — see §5).

---

## 1. Prisma Schema Additions

```prisma
enum VideoEventType {
  PLAY
  PAUSE
  RESUME
  SEEK
  HEARTBEAT   // sent every ~15s while playing, proves continuous watching
  COMPLETE
  SESSION_END // sent on unload/tab-close via navigator.sendBeacon
}

model VideoProgress {
  id              String   @id @default(cuid())
  studentId       String
  videoId         String
  lastPositionSec Int      @default(0)   // where to resume from
  totalWatchedSec Int      @default(0)   // derived, cached sum of actual watched seconds
  isCompleted     Boolean  @default(false)
  completedAt     DateTime?
  firstWatchedAt  DateTime?              // timestamp of the very first PLAY event
  lastActivityAt  DateTime @updatedAt
  createdAt       DateTime @default(now())

  student  User  @relation(fields: [studentId], references: [id])
  video    Video @relation(fields: [videoId], references: [id])

  @@unique([studentId, videoId])         // one progress row per student per video
  @@index([videoId])
}

model VideoWatchSession {
  id          String    @id @default(cuid())
  studentId   String
  videoId     String
  startedAt   DateTime
  endedAt     DateTime?                   // null while session is still "open"
  startPosSec Int                         // player position when session started
  endPosSec   Int?                        // player position at last known event
  watchedSec  Int       @default(0)       // actual seconds watched in this session (not wall-clock)

  student  User             @relation(fields: [studentId], references: [id])
  video    Video            @relation(fields: [videoId], references: [id])
  events   VideoWatchEvent[]

  @@index([studentId, videoId, startedAt])
}

model VideoWatchEvent {
  id         String         @id @default(cuid())
  sessionId  String
  studentId  String
  videoId    String
  type       VideoEventType
  positionSec Int                        // player currentTime at moment of event
  clientTs   DateTime                    // timestamp reported by client
  serverTs   DateTime       @default(now()) // authoritative receipt time
  metadata   Json?                       // e.g. { seekFrom, seekTo } for SEEK events

  session VideoWatchSession @relation(fields: [sessionId], references: [id])
  student User              @relation(fields: [studentId], references: [id])
  video   Video             @relation(fields: [videoId], references: [id])

  @@index([sessionId])
  @@index([studentId, videoId, clientTs])
}
```

Add relations on your existing `Video` and `User` models:
```prisma
model Video {
  // ...existing fields
  progress VideoProgress[]
  sessions VideoWatchSession[]
  events   VideoWatchEvent[]
}

model User {
  // ...existing fields
  videoProgress VideoProgress[]
  watchSessions VideoWatchSession[]
  watchEvents   VideoWatchEvent[]
}
```

This is additive only — no existing tables are touched, so nothing breaks.

---

## 2. Session boundary logic (the trickiest part)

A "session" = a continuous block of watching. It ends when the student stops for a meaningful gap or closes the tab. Define:

```
SESSION_TIMEOUT_SEC = 60   // no heartbeat/event for 60s+ => session is considered ended
```

**Rule:** A session stays "open" as long as events keep arriving within `SESSION_TIMEOUT_SEC` of each other. A `PAUSE` does NOT end a session by itself (Rahul paused at 10:05 and resumed at 10:20 — that's still session 1, just idle). A session ends when:
- Client explicitly sends `SESSION_END` (tab close via `sendBeacon`), OR
- Backend detects a gap on next event ≥ some **resume-gap threshold** (see below), OR
- `COMPLETE` fires.

Two different "gap" concepts you need to keep distinct (this is where most people's logic gets muddled):
- **Pause duration inside a session** (e.g. 10:05→10:20, 15 min) → this is what your example calls "gap between sessions." In practice, a long pause becomes a session boundary once it exceeds a threshold.
- **Session-boundary gap threshold**: use something like 10 minutes. If the student resumes within 10 minutes, treat it as the same session with idle time subtracted from watch time. If they come back after 10+ minutes, close the old session and open a new one — this is exactly why Rahul's data has **3 sessions**, not 1: the 10:05→10:20 gap (15 min) is enough to be its own session under this rule, and 10:28→11:30 (62 min) definitely is.

```
ON PAUSE event:
  mark session's last known state = PAUSED at positionSec, at clientTs

ON RESUME/PLAY event:
  gap = event.clientTs - lastEvent.clientTs
  IF gap >= SESSION_BOUNDARY_GAP (10 min):
      close previous session (endedAt = lastEvent.clientTs)
      open NEW VideoWatchSession (startedAt = event.clientTs, startPosSec = event.positionSec)
  ELSE:
      continue same session
```

---

## 3. Computing "actual watch time" (not wall-clock time)

Watch time must come from **PLAY/RESUME → PAUSE/SEEK/COMPLETE pairs**, using `positionSec` deltas, not timestamp deltas — this is what makes it seek-proof:

```
watchedSec for a segment = min(pauseEvent.positionSec - playEvent.positionSec, 
                                 pauseEvent.clientTs - playEvent.clientTs)
```

Taking the `min()` of position-delta and time-delta guards against two failure modes:
- If the student seeks forward while "playing" (no explicit pause), the position delta would overstate watch time — time-delta caps it.
- If the tab was backgrounded and events arrived late, time-delta could overstate — position delta (validated by heartbeats) catches that.

**Heartbeats matter here**: send one every 15s while actively playing. If no heartbeat arrives before a PAUSE/gap, treat elapsed time beyond the last heartbeat as *not* watched (student's device likely died/network dropped, don't credit that time).

Sum `watchedSec` across all segments across all sessions = `totalWatchedSec`.

**SEEK events** are logged with `metadata: { seekFrom, seekTo }` but contribute 0 watched seconds themselves — they just mark a discontinuity so the next PLAY segment starts counting from the new position.

---

## 4. Working through your Rahul example to verify the logic

| Time | Event | Position | Session |
|---|---|---|---|
| 10:00 | PLAY | 0:00 | Session 1 starts |
| 10:05 | PAUSE | 5:20 | — watched 5:20 in this segment |
| 10:20 | RESUME | 5:20 | gap = 15 min ≥ 10 min boundary → **Session 2 starts** |
| 10:28 | PAUSE | 13:40 | — watched 8:20 in this segment |
| 11:30 | RESUME | 13:40 | gap = 1h2m ≥ 10 min boundary → **Session 3 starts** |
| 11:50 | COMPLETE | 30:00 | — watched 16:20 in this segment |

```
totalWatchedSec = 5:20 + 8:20 + 16:20 = 30:00 ... 
```
Wait — that's 30 min, but your target output says 27 min. This is the exact kind of discrepancy that "shitty logic" produces if you don't define precisely what counts. The correct read: watch time only counts *while actually playing*, and 30:00 total video means the last segment (13:40→30:00 = 16:20 of position) should be checked against real elapsed play time too. If we assume the last stretch really was watched continuously start to finish with no skips, total watched = full 30:00 duration = 100% completion but **elapsed** ≠ **watched**. So:

- **Total actual watch time = 30:00** (every second of the 30-min video was played through — this matches "Completion: 100%")
- Your sample text says 27 minutes; that number only makes sense if there was an unstated skip/skip-ahead in the last segment. **Flag this to whoever wrote the target output** — with the events as given, watched time = full 30 min, not 27. Don't hardcode "27" as a magic number in your implementation; trust the derivation. If your product spec wants to allow for e.g. buffering stalls being excluded, that has to come from real heartbeat data, not be assumed.

Everything else derives cleanly:
- **First watched**: `firstWatchedAt` = clientTs of first-ever PLAY = 10:00 AM
- **Finished**: clientTs of COMPLETE = 11:50 AM
- **Total elapsed time** = finishedAt − firstWatchedAt = 1h 50m ✓
- **Sessions** = 3 (boundaries at the two gaps ≥ 10 min) ✓
- **Pauses** = count of PAUSE events = 2 ✓
- **Resumes** = count of RESUME events = 2 ✓
- **Gap 1→2** = 10:20 − 10:05 = 15 min ✓
- **Gap 2→3** = 11:30 − 10:28 = 1h 2m ✓

This confirms the session-boundary + segment-pairing algorithm above is the right model — just be precise about the watch-time number rather than copying an example figure that doesn't actually follow from the stated events.

---

## 5. Backend API design

```
POST   /api/videos/:videoId/events
  Auth: student, must be enrolled in the video's course
  Body: { type, positionSec, clientTs, metadata? }
  Logic: 
    - find or create/continue open VideoWatchSession per §2
    - insert VideoWatchEvent
    - update VideoProgress.lastPositionSec, lastActivityAt
    - if type === COMPLETE: set VideoProgress.isCompleted=true, completedAt=now
    - recompute VideoProgress.totalWatchedSec incrementally (§3), don't do a full table scan each call

GET    /api/videos/:videoId/progress
  Auth: student (their own only) — enforced via req.user.id === studentId, never trust a studentId in the body/query
  Returns: { lastPositionSec, isCompleted, totalWatchedSec }
  Used to resume playback on video load.

GET    /api/videos/:videoId/analytics
  Auth: teacher who owns the course/video ONLY
  Logic: verify video.course.teacherId === req.user.id, else 403
  Returns: aggregate analytics per-student (list) — see §6.

GET    /api/videos/:videoId/analytics/:studentId
  Auth: same as above (teacher-owns-video check)
  Returns: full detail for one student — sessions, event timeline, computed stats (the block in your example).
```

**Authorization middleware pattern** (apply consistently, don't reinvent per-route):
```js
async function requireVideoOwnerTeacher(req, res, next) {
  const video = await prisma.video.findUnique({
    where: { id: req.params.videoId },
    include: { course: true },
  });
  if (!video) return res.status(404).end();
  if (video.course.teacherId !== req.user.id) return res.status(403).end();
  req.video = video;
  next();
}

async function requireEnrolledStudent(req, res, next) {
  const enrolled = await prisma.enrollment.findFirst({
    where: { studentId: req.user.id, courseId: req.params.courseId },
  });
  if (!enrolled) return res.status(403).end();
  next();
}
```
Apply `requireVideoOwnerTeacher` to all `/analytics*` routes and `requireEnrolledStudent` (+ self-check on studentId) to all student-facing progress/event routes. This is what guarantees "students can't see other students' analytics" and "only the owning teacher sees analytics" — enforce it at the middleware layer, not scattered in controller logic, so it can't be accidentally skipped later.

---

## 6. Teacher analytics dashboard — aggregation query

Per-student summary row (list view):
```js
const rows = await prisma.videoProgress.findMany({
  where: { videoId },
  include: { student: { select: { id: true, name: true, email: true } } },
});
// pair with session counts:
const sessionCounts = await prisma.videoWatchSession.groupBy({
  by: ['studentId'],
  where: { videoId },
  _count: { id: true },
});
```
Detail view (single student, drill-down) pulls `VideoWatchSession` (with nested `events`) ordered by `startedAt`, plus the derived stats block computed via §3–4 logic — render exactly the shape you specified (watch time, elapsed time, session count, pause/resume counts, gaps, timeline).

---

## 7. Frontend player integration notes

- Wrap your `<video>` element's native events (`onPlay`, `onPause`, `onSeeked`, `onEnded`) → POST to `/events` immediately.
- Add a `setInterval(15000)` heartbeat **only while `!paused`**.
- On `beforeunload`/`visibilitychange` (tab hidden), fire a `SESSION_END` event via `navigator.sendBeacon` (fetch won't reliably complete on tab close).
- Debounce `SEEK` — native seeking fires many `timeupdate` events; only log on `seeked` (fired once user releases the scrub).
- On mount, `GET /progress` and set `video.currentTime = lastPositionSec` before allowing play, so resume works.
- Treat `COMPLETE` as: `positionSec >= duration - 2` (small buffer for player rounding) OR native `ended` event.

---

## 8. Rollout without breaking existing functionality

1. Migration is purely additive (new tables/enum, new relations) — run `prisma migrate dev`, no changes to existing columns.
2. New routes are new files/route groups — don't modify existing video-serving routes, just add tracking alongside.
3. Gate the whole feature behind the existing auth middleware you already have (don't write new auth logic — reuse your existing `req.user` session/JWT extraction).
4. Ship event logging first (low risk, write-only), verify data looks right in DB, *then* build the analytics read endpoints and dashboard UI on top.
