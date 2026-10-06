export type BulkMemberAction = 'activate' | 'deactivate' | 'delete';

// Apply a bulk operation in one state update, preserving order and other fields.
export function applyBulkMemberAction<T extends { id: string; isActive: boolean; pending?: boolean }>(members: T[], ids: readonly string[], action: BulkMemberAction): T[] {
  const selected = new Set(ids);
  if (action === 'delete') return members.filter(member => !selected.has(member.id));
  return members.map(member => selected.has(member.id)
    ? { ...member, isActive: action === 'activate', pending: false }
    : member);
}
