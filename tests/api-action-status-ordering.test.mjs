import assert from 'node:assert/strict';
import test from 'node:test';

import { actionStore } from '../apps/api/src/store/actions.ts';

test('terminal action results are not overwritten by later non-terminal status updates', () => {
  const action = actionStore.createAction('device-ordering-test', {
    kind: 'click',
    x: 0.5,
    y: 0.5,
    button: 'left',
  });

  const executed = actionStore.setResult(action.actionId, true);
  assert.equal(executed?.status, 'executed');

  const afterLateApprovedAck = actionStore.setStatus(action.actionId, 'approved');
  assert.equal(
    afterLateApprovedAck?.status,
    'executed',
    'late approved acks must not roll an executed action back to a non-terminal state'
  );
});
