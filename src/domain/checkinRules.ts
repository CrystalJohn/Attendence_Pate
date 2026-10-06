export type CheckinRole = 'MANAGEMENT' | 'GUEST';
export type SessionStatus = 'draft' | 'published' | 'live' | 'closed';

export type CheckinDecision = 'allowed' | 'duplicate' | 'closed' | 'inactive';

export function checkinDecision(input: { sessionOpen: boolean; alreadyCheckedIn: boolean; profileActive: boolean }): CheckinDecision {
  if (!input.sessionOpen) return 'closed';
  if (!input.profileActive) return 'inactive';
  if (input.alreadyCheckedIn) return 'duplicate';
  return 'allowed';
}

export function canViewAbsence(role: CheckinRole) {
  return role === 'MANAGEMENT';
}

export function canAcceptCheckin(input: { sessionOpen: boolean; sessionStatus: SessionStatus }) {
  return input.sessionOpen && (input.sessionStatus === 'published' || input.sessionStatus === 'live');
}

export function canViewPublicSession(status: SessionStatus) {
  return status === 'published' || status === 'live' || status === 'closed';
}
