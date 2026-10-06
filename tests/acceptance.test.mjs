import test from 'node:test';
import assert from 'node:assert/strict';

function checkinDecision({ sessionOpen, alreadyCheckedIn, profileActive }) {
  if (!sessionOpen) return 'closed';
  if (!profileActive) return 'inactive';
  if (alreadyCheckedIn) return 'duplicate';
  return 'allowed';
}

function canViewAbsence(role) {
  return role === 'MANAGEMENT';
}

function canAcceptCheckin({ sessionOpen, sessionStatus }) {
  return sessionOpen && (sessionStatus === 'published' || sessionStatus === 'live');
}

function canViewPublicSession(sessionStatus) {
  return ['published', 'live', 'closed'].includes(sessionStatus);
}

function memberStatus(member) {
  return member.pending ? 'pending' : member.isActive ? 'active' : 'inactive';
}

function filterMembers(members, { query = '', companion = 'ALL', status = 'ALL' } = {}) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return members.filter((member) => {
    const matchesQuery = !normalizedQuery || member.name.toLocaleLowerCase().includes(normalizedQuery) || member.companion.toLocaleLowerCase().includes(normalizedQuery);
    return matchesQuery && (companion === 'ALL' || member.companion === companion) && (status === 'ALL' || memberStatus(member) === status);
  });
}

function validateMemberDraft(draft, members, editingId = null) {
  const name = draft.name.trim();
  if (!name) return 'missing';
  if (members.some((member) => member.id !== editingId && member.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) return 'duplicate';
  return 'success';
}

test('does not create a second attendance record for the same member', () => {
  assert.equal(checkinDecision({ sessionOpen: true, alreadyCheckedIn: true, profileActive: true }), 'duplicate');
});

test('closed sessions and inactive profiles cannot check in', () => {
  assert.equal(checkinDecision({ sessionOpen: false, alreadyCheckedIn: false, profileActive: true }), 'closed');
  assert.equal(checkinDecision({ sessionOpen: true, alreadyCheckedIn: false, profileActive: false }), 'inactive');
});

test('absence data is private to management', () => {
  assert.equal(canViewAbsence('GUEST'), false);
  assert.equal(canViewAbsence('MANAGEMENT'), true);
});

test('session lifecycle keeps drafts private and only published/live sessions open check-in', () => {
  assert.equal(canAcceptCheckin({ sessionOpen: true, sessionStatus: 'draft' }), false);
  assert.equal(canAcceptCheckin({ sessionOpen: true, sessionStatus: 'published' }), true);
  assert.equal(canAcceptCheckin({ sessionOpen: true, sessionStatus: 'live' }), true);
  assert.equal(canAcceptCheckin({ sessionOpen: true, sessionStatus: 'closed' }), false);
  assert.equal(canViewPublicSession('draft'), false);
  assert.equal(canViewPublicSession('closed'), true);
});

test('member search and filters narrow the table', () => {
  const members = [
    { id: '1', name: 'Minh', companion: 'Nhóm Mầm xanh', isActive: true },
    { id: '2', name: 'Linh', companion: 'Nhóm Hạt giống', isActive: true },
    { id: '3', name: 'Bông', companion: 'Nhóm Mầm xanh', isActive: true, pending: true },
  ];
  assert.deepEqual(filterMembers(members, { query: 'minh' }).map((member) => member.id), ['1']);
  assert.deepEqual(filterMembers(members, { companion: 'Nhóm Mầm xanh' }).map((member) => member.id), ['1', '3']);
  assert.deepEqual(filterMembers(members, { status: 'pending' }).map((member) => member.id), ['3']);
});

test('member CRUD draft validation rejects empty and duplicate names', () => {
  const members = [{ id: '1', name: 'Minh' }];
  assert.equal(validateMemberDraft({ name: '  ' }, members), 'missing');
  assert.equal(validateMemberDraft({ name: 'minh' }, members), 'duplicate');
  assert.equal(validateMemberDraft({ name: 'Minh' }, members, '1'), 'success');
  assert.equal(validateMemberDraft({ name: 'Mai' }, members), 'success');
});
