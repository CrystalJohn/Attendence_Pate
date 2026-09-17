import test from 'node:test';
import assert from 'node:assert/strict';

function checkinDecision({ sessionOpen, alreadyCheckedIn, profileActive }) {
  if (!sessionOpen) return 'closed';
  if (!profileActive) return 'inactive';
  if (alreadyCheckedIn) return 'duplicate';
  return 'allowed';
}

function canViewAbsence(role) {
  return role === 'ADMIN' || role === 'LEADER';
}

test('does not create a second attendance record for the same member', () => {
  assert.equal(checkinDecision({ sessionOpen: true, alreadyCheckedIn: true, profileActive: true }), 'duplicate');
});

test('closed sessions and inactive profiles cannot check in', () => {
  assert.equal(checkinDecision({ sessionOpen: false, alreadyCheckedIn: false, profileActive: true }), 'closed');
  assert.equal(checkinDecision({ sessionOpen: true, alreadyCheckedIn: false, profileActive: false }), 'inactive');
});

test('absence data is private to leaders and admins', () => {
  assert.equal(canViewAbsence('MEMBER'), false);
  assert.equal(canViewAbsence('LEADER'), true);
  assert.equal(canViewAbsence('ADMIN'), true);
});
