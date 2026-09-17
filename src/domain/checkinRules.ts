export type CheckinRole = 'ADMIN' | 'LEADER' | 'MEMBER';

export type CheckinDecision = 'allowed' | 'duplicate' | 'closed' | 'inactive';

export function checkinDecision(input: { sessionOpen: boolean; alreadyCheckedIn: boolean; profileActive: boolean }): CheckinDecision {
  if (!input.sessionOpen) return 'closed';
  if (!input.profileActive) return 'inactive';
  if (input.alreadyCheckedIn) return 'duplicate';
  return 'allowed';
}

export function canViewAbsence(role: CheckinRole) {
  return role === 'ADMIN' || role === 'LEADER';
}
