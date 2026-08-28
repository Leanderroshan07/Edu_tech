# Video Watch Tracking & Teacher Analytics — Implementation Summary

This document details the implementation of the event-sourced video watch tracking and teacher analytics architecture built according to `video-tracking-spec.md`.

---

## 1. Database Schema Additions (`prisma/schema.prisma`)

### Models & Enums Added / Enhanced

1. **`VideoEventType` Enum**:
   Extended to include `HEARTBEAT` and `SESSION_END`:
   - `PLAY`: Player playback started.
   - `PAUSE`: Playback paused.
   - `RESUME`: Playback resumed after pause.
   - `SEEK`: Scrubbing / seeking to position (includes metadata `{ seekFrom, seekTo }`).
   - `HEARTBEAT`: Periodic 15s ping while playing to confirm active engagement.
   - `COMPLETE`: Video playback reached completion threshold or end.
   - `SESSION_END`: Player unloaded or tab closed (`navigator.sendBeacon`).

2. **`VideoWatchSession` Model**:
   - `id`: Unique session identifier (UUID).
   - `studentProfileId`: Foreign key to `StudentProfile`.
   - `materialId`: Foreign key to `Material`.
   - `startedAt`: Timestamp when session started.
   - `endedAt`: Timestamp when session ended (nullable while open).
   - `startPosSec`: Initial playback position.
   - `endPosSec`: Final/latest playback position.
   - `watchedSec`: Derived actual watched seconds in this session.

3. **`VideoEventLog` Model (Enhanced Event Log)**:
   - Tied to `sessionId` (`VideoWatchSession`).
   - Stores `clientTs` (reported by client) and `serverTs` (authoritative receipt time).
   - `metadata`: JSON payload for seek vectors or client details.

4. **`VideoProgress` Model**:
   - Stores current state (`lastPositionSeconds`, `completionPercent`, `isCompleted`, `totalWatchTimeSeconds`, `sessionCount`, `pauseCount`, `resumeCount`, `firstWatchedAt`, `lastWatchedAt`, `finishedAt`).

---

## 2. Core Business & Boundary Algorithms

### Session Boundary Detection Algorithm (§2)
- **Boundary Threshold (`SESSION_BOUNDARY_GAP_SEC = 600`)**: If an event arrives with a gap $\ge 10\text{ minutes}$ from the last recorded timestamp in the active session, the previous session is closed and a new `VideoWatchSession` is created.
- **Explicit End**: `COMPLETE` or `SESSION_END` events automatically close the session.

### Watch Time Calculation (`min(posDelta, timeDelta)`) (§3)
- For continuous playing segments (`PAUSE`, `HEARTBEAT`, `COMPLETE`, `SESSION_END` following `PLAY`/`RESUME`/`HEARTBEAT`):
  $$\text{watchedSecSegment} = \min(\text{positionSeconds} - \text{lastPositionSeconds}, \text{clientTs} - \text{lastClientTs})$$
- Guarding against seeking forwards or backgrounded tabs overcounting watch time.

---

## 3. Backend API Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/materials/:id/events` | `STUDENT` | Log raw event (`PLAY`, `PAUSE`, `RESUME`, `SEEK`, `HEARTBEAT`, `COMPLETE`, `SESSION_END`). Updates sessions & progress. |
| `GET` | `/materials/:id/progress` | `STUDENT` | Fetch student's own progress (position, completion status) to resume playback. |
| `GET` | `/materials/:id/analytics` | `TEACHER`, `HOD`, `ADMIN` | Summary view of video performance across all enrolled students in the department. |
| `GET` | `/materials/:id/analytics/student/:studentProfileId` | `TEACHER`, `HOD`, `ADMIN` | Detailed drill-down view for a specific student, including session list, gaps, metrics, and timeline. |

---

## 4. Security & Access Control
- **Student Privacy Guard**: Students are forbidden from accessing analytics endpoints (`getVideoAnalytics` and `getVideoStudentAnalytics` return `403 Forbidden`).
- **Department/Teacher Scoping**: Teachers can only view analytics for videos they own or teach within assigned departments; HODs can view analytics within their department.
