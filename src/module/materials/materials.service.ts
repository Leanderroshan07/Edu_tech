import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, VideoEventType } from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { AccessTokenPayload } from '../../auth/strategies/jwt.strategy';
import { CreateMaterialDto } from './dto/create-material.dto';
import { RecordVideoEventDto } from './dto/record-event.dto';

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMaterialDto, currentUser: AccessTokenPayload) {
    if (currentUser.role !== Role.TEACHER && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Only teachers or admins can upload materials');
    }

    const dept = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!dept) throw new BadRequestException(`Department '${dto.departmentId}' not found`);

    if (dto.subjectId) {
      const subject = await this.prisma.subject.findUnique({
        where: { id: dto.subjectId },
      });
      if (!subject) throw new BadRequestException(`Subject '${dto.subjectId}' not found`);
    }

    return this.prisma.material.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim(),
        type: dto.type,
        fileUrl: dto.fileUrl,
        durationSeconds: dto.durationSeconds ?? 0,
        teacherId: currentUser.sub,
        subjectId: dto.subjectId || null,
        departmentId: dto.departmentId,
      },
      include: this.materialInclude(),
    });
  }

  async findAll(currentUser: AccessTokenPayload, subjectId?: string, departmentId?: string) {
    let whereClause: Prisma.MaterialWhereInput = {};
    let studentProfileId: string | null = null;

    if (currentUser.role === Role.STUDENT) {
      const studentProfile = await this.prisma.studentProfile.findUnique({
        where: { userId: currentUser.sub },
      });
      if (!studentProfile) throw new NotFoundException('Student profile not found');
      studentProfileId = studentProfile.id;

      whereClause = {
        departmentId: studentProfile.departmentId,
        ...(subjectId ? { subjectId } : {}),
      };
    } else if (currentUser.role === Role.TEACHER) {
      const teacherProfile = await this.prisma.teacherProfile.findUnique({
        where: { userId: currentUser.sub },
        include: { teachingDepartments: true },
      });
      if (!teacherProfile) throw new NotFoundException('Teacher profile not found');

      const allowedDeptIds = [
        teacherProfile.departmentId,
        ...teacherProfile.teachingDepartments.map((td) => td.departmentId),
      ];

      whereClause = {
        OR: [
          { teacherId: currentUser.sub },
          { departmentId: { in: allowedDeptIds } },
        ],
        ...(subjectId ? { subjectId } : {}),
        ...(departmentId ? { departmentId } : {}),
      };
    } else if (currentUser.role === Role.HOD) {
      const hodProfile = await this.prisma.hodProfile.findUnique({
        where: { userId: currentUser.sub },
      });
      if (!hodProfile) throw new NotFoundException('HOD profile not found');

      whereClause = {
        departmentId: hodProfile.departmentId,
        ...(subjectId ? { subjectId } : {}),
      };
    } else {
      // ADMIN
      whereClause = {
        ...(subjectId ? { subjectId } : {}),
        ...(departmentId ? { departmentId } : {}),
      };
    }

    const materials = await this.prisma.material.findMany({
      where: whereClause,
      include: this.materialInclude(),
      orderBy: { createdAt: 'desc' },
    });

    // For students: attach their individual progress to each material
    if (studentProfileId) {
      const progressRecords = await this.prisma.videoProgress.findMany({
        where: { studentProfileId },
      });
      const progressMap = new Map(progressRecords.map((p) => [p.materialId, p]));

      return materials.map((m) => ({
        ...m,
        userProgress: progressMap.get(m.id)
          ? {
              lastPositionSeconds: progressMap.get(m.id)!.lastPositionSeconds,
              completionPercent: progressMap.get(m.id)!.completionPercent,
              isCompleted: progressMap.get(m.id)!.isCompleted,
            }
          : null,
      }));
    }

    return materials;
  }

  async findOne(id: string, currentUser: AccessTokenPayload) {
    const material = await this.prisma.material.findUnique({
      where: { id },
      include: this.materialInclude(),
    });
    if (!material) throw new NotFoundException(`Material '${id}' not found`);

    if (currentUser.role === Role.STUDENT) {
      const studentProfile = await this.prisma.studentProfile.findUnique({
        where: { userId: currentUser.sub },
      });
      if (studentProfile) {
        const progress = await this.prisma.videoProgress.findUnique({
          where: {
            studentProfileId_materialId: {
              studentProfileId: studentProfile.id,
              materialId: id,
            },
          },
        });
        return { ...material, userProgress: progress || null };
      }
    }

    return material;
  }

  async remove(id: string, currentUser: AccessTokenPayload) {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) throw new NotFoundException(`Material '${id}' not found`);

    if (currentUser.role !== Role.ADMIN) {
      if (currentUser.role === Role.TEACHER && material.teacherId !== currentUser.sub) {
        throw new ForbiddenException('You can only delete materials that you uploaded');
      }
      if (currentUser.role === Role.HOD) {
        const hodProfile = await this.prisma.hodProfile.findUnique({
          where: { userId: currentUser.sub },
        });
        if (!hodProfile || hodProfile.departmentId !== material.departmentId) {
          throw new ForbiddenException('You can only delete materials in your department');
        }
      }
    }

    await this.prisma.material.delete({ where: { id } });
    return { message: `Material '${id}' deleted successfully` };
  }

  // ─── Record Live Video Event from Student ──────────────────────────────────
  async recordVideoEvent(
    materialId: string,
    dto: RecordVideoEventDto,
    currentUser: AccessTokenPayload,
  ) {
    if (currentUser.role !== Role.STUDENT) {
      throw new ForbiddenException('Only students can record video progress events');
    }

    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId: currentUser.sub },
    });
    if (!studentProfile) throw new NotFoundException('Student profile not found');

    const material = await this.prisma.material.findUnique({ where: { id: materialId } });
    if (!material) throw new NotFoundException('Material not found');

    // ─── FIX: Fetch existingProgress before computing watch time ───────────
    // Previously missing — caused totalWatchTimeSeconds to reset to 0 on every event.
    const existingProgress = await this.prisma.videoProgress.findUnique({
      where: {
        studentProfileId_materialId: {
          studentProfileId: studentProfile.id,
          materialId,
        },
      },
    });

    const clientTs = dto.clientTs ? new Date(dto.clientTs) : new Date();
    const serverTs = new Date();
    const SESSION_BOUNDARY_GAP_SEC = 600; // 10 minutes session gap threshold

    // 1. Find active open session (where endedAt is null)
    let activeSession = await this.prisma.videoWatchSession.findFirst({
      where: {
        studentProfileId: studentProfile.id,
        materialId,
        endedAt: null,
      },
      orderBy: { startedAt: 'desc' },
    });

    const lastEvent = activeSession
      ? await this.prisma.videoEventLog.findFirst({
          where: { sessionId: activeSession.id },
          orderBy: { clientTs: 'desc' },
        })
      : null;

    if (activeSession) {
      const lastTs = lastEvent ? lastEvent.clientTs : activeSession.startedAt;
      const gapSeconds = (clientTs.getTime() - new Date(lastTs).getTime()) / 1000;

      if (gapSeconds >= SESSION_BOUNDARY_GAP_SEC) {
        await this.prisma.videoWatchSession.update({
          where: { id: activeSession.id },
          data: {
            endedAt: lastTs,
            endPosSec: lastEvent?.positionSeconds ?? activeSession.startPosSec,
          },
        });
        activeSession = null;
      }
    }

    if (!activeSession) {
      activeSession = await this.prisma.videoWatchSession.create({
        data: {
          studentProfileId: studentProfile.id,
          materialId,
          startedAt: clientTs,
          startPosSec: dto.positionSeconds,
          endPosSec: dto.positionSeconds,
          watchedSec: 0,
        },
      });
    }

    // ─── Pause-Skip Detection ───────────────────────────────────────────────
    // Detect when a student pauses the video and then seeks forward significantly.
    // This is a signal that they may be skipping content to cheat checkpoints.
    // Logged as SEEK event metadata — does NOT prevent progress, just flags it.
    let pauseSkipMeta: Record<string, any> | null = null;
    if (dto.eventType === VideoEventType.SEEK && lastEvent?.eventType === VideoEventType.PAUSE) {
      const jumpedSec = dto.positionSeconds - lastEvent.positionSeconds;
      const dur = material.durationSeconds && material.durationSeconds > 0 ? material.durationSeconds : 1;
      const jumpedPct = (jumpedSec / dur) * 100;

      if (jumpedSec > 0 && jumpedPct > 3) {
        // Jumped forward more than 3% of video length after a pause
        pauseSkipMeta = {
          pauseSkipDetected: true,
          seekFrom: Math.round(lastEvent.positionSeconds),
          seekTo: Math.round(dto.positionSeconds),
          jumpedSeconds: Math.round(jumpedSec),
          jumpedPercent: Math.round(jumpedPct * 10) / 10,
          description: `⚠️ Pause-skip detected: jumped ${Math.round(jumpedSec)}s forward (${Math.round(jumpedPct)}% of video)`,
        };
      }
    }

    // 2. Create VideoEventLog tied to activeSession
    await this.prisma.videoEventLog.create({
      data: {
        sessionId: activeSession.id,
        studentProfileId: studentProfile.id,
        materialId,
        eventType: dto.eventType,
        positionSeconds: dto.positionSeconds,
        clientTs,
        serverTs,
        metadata: pauseSkipMeta
          ? pauseSkipMeta
          : dto.metadata
            ? dto.metadata
            : Prisma.JsonNull,
        timestamp: serverTs,
      },
    });

    // 3. Compute actual watched seconds: min(posDelta, timeDelta) — seek-proof
    let watchedIncrement = 0;
    if (
      (dto.eventType === VideoEventType.PAUSE ||
        dto.eventType === VideoEventType.HEARTBEAT ||
        dto.eventType === VideoEventType.COMPLETE ||
        dto.eventType === VideoEventType.SESSION_END) &&
      lastEvent &&
      (lastEvent.eventType === VideoEventType.PLAY ||
        lastEvent.eventType === VideoEventType.RESUME ||
        lastEvent.eventType === VideoEventType.HEARTBEAT)
    ) {
      const posDelta = dto.positionSeconds - lastEvent.positionSeconds;
      const timeDelta = (clientTs.getTime() - new Date(lastEvent.clientTs).getTime()) / 1000;
      if (posDelta > 0 && timeDelta > 0) {
        watchedIncrement = Math.min(posDelta, timeDelta);
      }
    }

    const isSessionEndEvent =
      dto.eventType === VideoEventType.COMPLETE || dto.eventType === VideoEventType.SESSION_END;

    await this.prisma.videoWatchSession.update({
      where: { id: activeSession.id },
      data: {
        endPosSec: dto.positionSeconds,
        watchedSec: { increment: watchedIncrement },
        ...(isSessionEndEvent ? { endedAt: clientTs } : {}),
      },
    });

    // 4. Accumulate total watch time (uses existingProgress fetched above — the fix)
    const newTotalWatchTime = (existingProgress?.totalWatchTimeSeconds || 0) + watchedIncrement;

    // ─── Fixed 4-Checkpoint System (25% / 50% / 75% / 100%) ─────────────────
    // Always exactly 4 checkpoints regardless of video length.
    // A checkpoint is only credited when ACTUAL WATCH TIME reaches the threshold.
    // Seeking forward without watching does NOT unlock checkpoints.
    const duration = material.durationSeconds && material.durationSeconds > 0 ? material.durationSeconds : 1;
    const CHECKPOINT_THRESHOLDS = [0.25, 0.50, 0.75, 1.0];

    let existingReached: number[] = [];
    if (existingProgress?.metadata && typeof existingProgress.metadata === 'object') {
      const meta = existingProgress.metadata as any;
      if (Array.isArray(meta.reachedCheckpoints)) {
        existingReached = meta.reachedCheckpoints;
      }
    }

    const newReached = new Set<number>(existingReached);

    for (let k = 1; k <= 4; k++) {
      const watchTimeRequired = CHECKPOINT_THRESHOLDS[k - 1] * duration;
      const isWatchTimeGate = newTotalWatchTime >= watchTimeRequired;
      const isCompleteEvent = dto.eventType === VideoEventType.COMPLETE;

      if ((isWatchTimeGate || isCompleteEvent) && !newReached.has(k)) {
        newReached.add(k);

        // Log checkpoint reached as a distinct event in the timeline
        await this.prisma.videoEventLog.create({
          data: {
            sessionId: activeSession.id,
            studentProfileId: studentProfile.id,
            materialId,
            eventType: VideoEventType.HEARTBEAT,
            positionSeconds: dto.positionSeconds,
            clientTs,
            serverTs,
            metadata: {
              isCheckpoint: true,
              checkpointIndex: k,
              totalCheckpoints: 4,
              checkpointPercent: k * 25,
              description: `✅ Checkpoint ${k}/4 reached — ${k * 25}% of video watched`,
            },
            timestamp: serverTs,
          },
        });
      }
    }

    const reachedArray = Array.from(newReached).sort((a, b) => a - b);
    // completionPercent is strictly checkpoint-based: each of 4 checkpoints = 25%
    const computedPercent = reachedArray.length * 25;

    const firstWatchedAt = existingProgress?.firstWatchedAt || clientTs;
    let finishedAt = existingProgress?.finishedAt || null;
    let isCompleted = existingProgress?.isCompleted || false;

    if (dto.eventType === VideoEventType.COMPLETE || reachedArray.length >= 4) {
      isCompleted = true;
      if (!finishedAt) finishedAt = clientTs;
    }

    const totalWatchSessionsCount = await this.prisma.videoWatchSession.count({
      where: { studentProfileId: studentProfile.id, materialId },
    });

    const pauseCount = await this.prisma.videoEventLog.count({
      where: { studentProfileId: studentProfile.id, materialId, eventType: VideoEventType.PAUSE },
    });

    const resumeCount = await this.prisma.videoEventLog.count({
      where: { studentProfileId: studentProfile.id, materialId, eventType: VideoEventType.RESUME },
    });

    const updatedMetadata = {
      ...(typeof existingProgress?.metadata === 'object' ? (existingProgress.metadata as object) : {}),
      reachedCheckpoints: reachedArray,
      totalCheckpoints: 4,
    };

    await this.prisma.videoProgress.upsert({
      where: {
        studentProfileId_materialId: {
          studentProfileId: studentProfile.id,
          materialId,
        },
      },
      update: {
        lastPositionSeconds: dto.positionSeconds,
        completionPercent: computedPercent,
        isCompleted,
        firstWatchedAt,
        lastWatchedAt: clientTs,
        finishedAt,
        totalWatchTimeSeconds: newTotalWatchTime,
        sessionCount: totalWatchSessionsCount,
        pauseCount,
        resumeCount,
        metadata: updatedMetadata,
      },
      create: {
        studentProfileId: studentProfile.id,
        materialId,
        lastPositionSeconds: dto.positionSeconds,
        completionPercent: computedPercent,
        isCompleted,
        firstWatchedAt,
        lastWatchedAt: clientTs,
        finishedAt,
        totalWatchTimeSeconds: newTotalWatchTime,
        sessionCount: totalWatchSessionsCount,
        pauseCount,
        resumeCount,
        metadata: updatedMetadata,
      },
    });

    // ─── Return structured response — frontend reads this to update UI ───────
    return {
      completionPercent: computedPercent,
      isCompleted,
      lastPositionSeconds: dto.positionSeconds,
      totalWatchTimeSeconds: newTotalWatchTime,
      pauseSkipDetected: !!pauseSkipMeta,
      checkpoints: CHECKPOINT_THRESHOLDS.map((threshold, idx) => ({
        index: idx + 1,
        percent: (idx + 1) * 25,
        reached: reachedArray.includes(idx + 1),
        watchTimeRequired: Math.round(threshold * duration),
      })),
    };
  }

  // ─── Get Student Saved Progress ────────────────────────────────────────────
  async getStudentProgress(materialId: string, currentUser: AccessTokenPayload) {
    if (currentUser.role !== Role.STUDENT) {
      throw new ForbiddenException('Only students can fetch their individual progress');
    }

    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId: currentUser.sub },
    });
    if (!studentProfile) throw new NotFoundException('Student profile not found');

    const progress = await this.prisma.videoProgress.findUnique({
      where: {
        studentProfileId_materialId: {
          studentProfileId: studentProfile.id,
          materialId,
        },
      },
    });

    return (
      progress || {
        lastPositionSeconds: 0,
        completionPercent: 0,
        isCompleted: false,
        totalWatchTimeSeconds: 0,
      }
    );
  }

  // ─── Single Student Detailed Video Analytics ──────────────────────────────
  async getVideoStudentAnalytics(
    materialId: string,
    studentProfileId: string,
    currentUser: AccessTokenPayload,
  ) {
    if (currentUser.role === Role.STUDENT) {
      throw new ForbiddenException('Students are not permitted to view student analytics.');
    }

    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
      include: { department: true, subject: true, teacher: true },
    });
    if (!material) throw new NotFoundException('Material not found');

    this.checkTeacherOrHodAccess(material, currentUser);

    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImageUrl: true,
          },
        },
      },
    });
    if (!studentProfile) throw new NotFoundException('Student profile not found');

    const progress = await this.prisma.videoProgress.findUnique({
      where: {
        studentProfileId_materialId: {
          studentProfileId,
          materialId,
        },
      },
    });

    const sessions = await this.prisma.videoWatchSession.findMany({
      where: { studentProfileId, materialId },
      include: {
        events: {
          orderBy: { clientTs: 'asc' },
        },
      },
      orderBy: { startedAt: 'asc' },
    });

    const eventLogs = await this.prisma.videoEventLog.findMany({
      where: { studentProfileId, materialId },
      orderBy: { clientTs: 'asc' },
    });

    const { sessionGaps, timeline, totalElapsedTimeFormatted } = this.computeSessionDetailsFromSessions(
      sessions,
      eventLogs,
      material.durationSeconds || 0,
    );

    return {
      material: {
        id: material.id,
        title: material.title,
        type: material.type,
        durationSeconds: material.durationSeconds,
        durationFormatted: this.formatSeconds(material.durationSeconds || 0),
        departmentName: material.department.name,
        subjectName: material.subject?.name || 'General',
        teacherName: `${material.teacher.firstName} ${material.teacher.lastName}`,
      },
      student: {
        id: studentProfile.id,
        userId: studentProfile.user.id,
        name: `${studentProfile.user.firstName} ${studentProfile.user.lastName}`,
        email: studentProfile.user.email,
        registerNumber: studentProfile.registerNumber,
        profileImageUrl: studentProfile.user.profileImageUrl,
      },
      metrics: {
        totalWatchTimeSeconds: progress?.totalWatchTimeSeconds || 0,
        totalWatchTimeFormatted: this.formatSeconds(progress?.totalWatchTimeSeconds || 0),
        firstWatchedAt: progress?.firstWatchedAt || (eventLogs[0]?.clientTs ?? null),
        finishedAt: progress?.finishedAt || null,
        totalElapsedTimeFormatted,
        sessionCount: sessions.length,
        pauseCount: progress?.pauseCount || eventLogs.filter((l) => l.eventType === VideoEventType.PAUSE).length,
        resumeCount: progress?.resumeCount || eventLogs.filter((l) => l.eventType === VideoEventType.RESUME).length,
        completionPercent: progress?.completionPercent || 0,
        isCompleted: progress?.isCompleted || false,
      },
      sessions: sessions.map((s, idx) => ({
        sessionId: s.id,
        sessionIndex: idx + 1,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        startPosSec: s.startPosSec,
        startPosFormatted: this.formatSeconds(s.startPosSec),
        endPosSec: s.endPosSec,
        endPosFormatted: s.endPosSec ? this.formatSeconds(s.endPosSec) : null,
        watchedSec: s.watchedSec,
        watchedSecFormatted: this.formatSeconds(s.watchedSec),
        eventCount: s.events.length,
      })),
      sessionGaps,
      timeline,
    };
  }

  // ─── Comprehensive Teacher / HOD / Admin Video Analytics ────────────────────
  async getVideoAnalytics(materialId: string, currentUser: AccessTokenPayload) {
    if (currentUser.role === Role.STUDENT) {
      throw new ForbiddenException('Students are not permitted to view video analytics.');
    }

    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
      include: { department: true, subject: true, teacher: true },
    });
    if (!material) throw new NotFoundException('Material not found');

    await this.checkTeacherOrHodAccess(material, currentUser);

    // Query all students in department OR students who have progress/event logs for this material
    const enrolledStudents = await this.prisma.studentProfile.findMany({
      where: {
        OR: [
          { departmentId: material.departmentId },
          { videoProgresses: { some: { materialId } } },
          { videoEventLogs: { some: { materialId } } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profileImageUrl: true,
          },
        },
      },
      orderBy: { registerNumber: 'asc' },
    });

    const progressRecords = await this.prisma.videoProgress.findMany({
      where: { materialId },
    });
    const progressMap = new Map(progressRecords.map((p) => [p.studentProfileId, p]));

    const sessionsList = await this.prisma.videoWatchSession.findMany({
      where: { materialId },
      orderBy: { startedAt: 'asc' },
    });
    const studentSessionsMap = new Map<string, typeof sessionsList>();
    for (const session of sessionsList) {
      const list = studentSessionsMap.get(session.studentProfileId) || [];
      list.push(session);
      studentSessionsMap.set(session.studentProfileId, list);
    }

    // Fetch all event logs for this material to compute timelines per student
    const allEventLogs = await this.prisma.videoEventLog.findMany({
      where: { materialId },
      orderBy: { clientTs: 'asc' },
    });
    const studentEventLogsMap = new Map<string, typeof allEventLogs>();
    for (const log of allEventLogs) {
      const list = studentEventLogsMap.get(log.studentProfileId) || [];
      list.push(log);
      studentEventLogsMap.set(log.studentProfileId, list);
    }

    const studentAnalyticsList = enrolledStudents.map((student) => {
      const progress = progressMap.get(student.id);
      const studentSessions = studentSessionsMap.get(student.id) || [];
      const studentEventLogs = studentEventLogsMap.get(student.id) || [];
      // Student has watched if event logs exist OR sessions exist OR total watch time > 0
      const hasWatched =
        studentEventLogs.length > 0 ||
        studentSessions.length > 0 ||
        (progress && progress.totalWatchTimeSeconds > 0);

      const { sessionGaps, timeline, totalElapsedTimeFormatted } =
        this.computeSessionDetailsFromSessions(
          studentSessions,
          studentEventLogs,
          material.durationSeconds || 0,
        );

      return {
        student: {
          id: student.id,
          userId: student.user.id,
          name: `${student.user.firstName} ${student.user.lastName}`,
          email: student.user.email,
          registerNumber: student.registerNumber,
          profileImageUrl: student.user.profileImageUrl,
        },
        hasWatched: !!hasWatched,
        metrics: {
          videoTitle: material.title,
          videoDurationSeconds: material.durationSeconds || 0,
          videoDurationFormatted: this.formatSeconds(material.durationSeconds || 0),
          totalWatchTimeSeconds: progress?.totalWatchTimeSeconds || 0,
          totalWatchTimeFormatted: this.formatSeconds(progress?.totalWatchTimeSeconds || 0),
          totalElapsedTimeFormatted,
          firstWatchedAt: progress?.firstWatchedAt || null,
          finishedAt: progress?.finishedAt || null,
          sessionCount: studentSessions.length || progress?.sessionCount || 0,
          pauseCount: progress?.pauseCount || 0,
          resumeCount: progress?.resumeCount || 0,
          completionPercent: progress?.completionPercent || 0,
          isCompleted: progress?.isCompleted || false,
        },
        sessionGaps,
        timeline,
      };
    });

    const watchedCount = studentAnalyticsList.filter((s) => s.hasWatched).length;
    const notWatchedCount = studentAnalyticsList.length - watchedCount;

    return {
      material: {
        id: material.id,
        title: material.title,
        type: material.type,
        durationSeconds: material.durationSeconds,
        durationFormatted: this.formatSeconds(material.durationSeconds || 0),
        departmentName: material.department.name,
        subjectName: material.subject?.name || 'General',
        teacherName: `${material.teacher.firstName} ${material.teacher.lastName}`,
        createdAt: material.createdAt,
      },
      summary: {
        totalEnrolledStudents: enrolledStudents.length,
        watchedCount,
        notWatchedCount,
        averageCompletionPercent:
          studentAnalyticsList.length > 0
            ? Math.round(
                studentAnalyticsList.reduce((acc, s) => acc + s.metrics.completionPercent, 0) /
                  studentAnalyticsList.length,
              )
            : 0,
      },
      students: studentAnalyticsList,
    };
  }

  private async checkTeacherOrHodAccess(material: any, currentUser: AccessTokenPayload) {
    if (currentUser.role === Role.TEACHER && material.teacherId !== currentUser.sub) {
      const teacherProfile = await this.prisma.teacherProfile.findUnique({
        where: { userId: currentUser.sub },
        include: { teachingDepartments: true },
      });
      const allowedDeptIds = teacherProfile
        ? [teacherProfile.departmentId, ...teacherProfile.teachingDepartments.map((td) => td.departmentId)]
        : [];
      if (!allowedDeptIds.includes(material.departmentId)) {
        throw new ForbiddenException('You can only view analytics for videos in your assigned departments');
      }
    } else if (currentUser.role === Role.HOD) {
      const hodProfile = await this.prisma.hodProfile.findUnique({
        where: { userId: currentUser.sub },
      });
      if (!hodProfile || hodProfile.departmentId !== material.departmentId) {
        throw new ForbiddenException('You can only view analytics for materials in your department');
      }
    }
  }

  // ─── Helper: Compute Session Gaps and Timeline ─────────────────────────────
  private computeSessionDetailsFromSessions(
    sessions: any[],
    eventLogs: any[],
    durationSeconds: number,
  ) {
    if (!eventLogs || eventLogs.length === 0) {
      return {
        sessionGaps: [],
        timeline: [],
        totalElapsedTimeFormatted: '0m',
      };
    }

    const firstTimestamp = new Date(eventLogs[0].clientTs);
    const lastTimestamp = new Date(eventLogs[eventLogs.length - 1].clientTs);
    const elapsedMs = lastTimestamp.getTime() - firstTimestamp.getTime();
    const totalElapsedTimeFormatted = this.formatDurationMs(elapsedMs);

    const sessionGaps: string[] = [];
    for (let i = 0; i < sessions.length - 1; i++) {
      const endOfCurr = sessions[i].endedAt ? new Date(sessions[i].endedAt) : null;
      const startOfNext = new Date(sessions[i + 1].startedAt);
      if (endOfCurr) {
        const gapMs = startOfNext.getTime() - endOfCurr.getTime();
        if (gapMs > 60000) {
          const gapFormatted = this.formatDurationMs(gapMs);
          sessionGaps.push(`Gap between session ${i + 1} and session ${i + 2}: ${gapFormatted}`);
        }
      }
    }

    const timeline = eventLogs.map((log) => {
      const timeFormatted = new Date(log.clientTs).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const posFormatted = this.formatSeconds(log.positionSeconds);

      let description = '';
      if (log.metadata && typeof log.metadata === 'object' && (log.metadata as any).description) {
        description = (log.metadata as any).description;
      } else {
        switch (log.eventType) {
          case VideoEventType.PLAY:
            description = `Play at ${posFormatted}`;
            break;
          case VideoEventType.PAUSE:
            description = `Pause at ${posFormatted}`;
            break;
          case VideoEventType.RESUME:
            description = `Resume from ${posFormatted}`;
            break;
          case VideoEventType.SEEK:
            description = `Seek to ${posFormatted}`;
            break;
          case VideoEventType.HEARTBEAT:
            description = `Heartbeat at ${posFormatted}`;
            break;
          case VideoEventType.COMPLETE:
            description = `Video completed 🏆`;
            break;
          case VideoEventType.SESSION_END:
            description = `Session ended`;
            break;
        }
      }

      return {
        eventType: log.eventType,
        positionSeconds: log.positionSeconds,
        positionFormatted: posFormatted,
        clientTs: log.clientTs,
        timeFormatted,
        description,
        metadata: log.metadata,
      };
    });

    return { sessionGaps, timeline, totalElapsedTimeFormatted };
  }

  private formatSeconds(totalSeconds: number): string {
    const s = Math.round(totalSeconds);
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  private formatDurationMs(ms: number): string {
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h`;
    }
    return `${minutes} minutes`;
  }

  private materialInclude() {
    return {
      department: true,
      subject: true,
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          profileImageUrl: true,
        },
      },
    };
  }
}
