import type { MascotId } from './mascotIds';
import { createUuid } from './ids';

export type SessionStatus = 'draft' | 'published' | 'live' | 'closed';

export type AttendanceSession = {
  id: string;
  title: string;
  date: string;
  startsAt: string;
  qrToken: string;
  status: SessionStatus;
};

export type SessionAttendance = {
  id: string;
  sessionId: string;
  memberId: string;
  memberName: string;
  mascotId?: MascotId;
  checkedInAt: string;
  checkedAtLabel: string;
  mood: string;
};

export function makeAttendanceSession(status: SessionStatus = 'live', now = new Date()): AttendanceSession {
  const id = createUuid();
  return {
    id,
    title: 'Tối thứ tư trong tổ',
    date: now.toISOString(),
    startsAt: now.toISOString(),
    qrToken: createUuid(),
    status,
  };
}

export function isSessionCheckinOpen(session: AttendanceSession | undefined, sessionOpen: boolean) {
  return Boolean(session && sessionOpen && (session.status === 'published' || session.status === 'live'));
}

export function hasSessionAttendance(records: SessionAttendance[], sessionId: string, memberId: string) {
  return records.some((record) => record.sessionId === sessionId && record.memberId === memberId);
}

export function sessionAttendances(records: SessionAttendance[], sessionId: string) {
  return records.filter((record) => record.sessionId === sessionId);
}
