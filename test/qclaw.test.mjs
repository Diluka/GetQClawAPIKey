import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractRespData,
  normalizeModelRows,
  summarizeUsageDetails,
} from '../lib/qclaw.mjs';

test('extractRespData reads QClaw JPrx nested response data', () => {
  const payload = {
    ret: 0,
    data: {
      resp: {
        common: { code: 0, message: 'Success' },
        data: { ok: true },
      },
    },
  };

  assert.deepEqual(extractRespData(payload), { ok: true });
});

test('normalizeModelRows maps status and rate information', () => {
  const rows = normalizeModelRows(
    [
      { id: 'default', name: 'Auto', status_level: 0 },
      { id: 'pool-glm-5.2', name: 'GLM-5.2', status_level: 2 },
    ],
    [
      { model_id: 'default', rate_multiplier: 'x1.0' },
      { model_id: 'pool-glm-5.2', rate_multiplier: 'x2.5' },
    ],
  );

  assert.deepEqual(rows, [
    { id: 'modelroute', name: 'Auto', status: 'available', rate: 'x1.0', capabilities: [] },
    { id: 'pool-glm-5.2', name: 'GLM-5.2', status: 'full', rate: 'x2.5', capabilities: [] },
  ]);
});

test('summarizeUsageDetails totals usage records', () => {
  const summary = summarizeUsageDetails({
    total: 2,
    records: [
      { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15, cost: 0.1 },
      { prompt_tokens: 20, completion_tokens: 7, total_tokens: 27, cost: 0.2 },
    ],
  });

  assert.deepEqual(summary, {
    totalRecords: 2,
    promptTokens: 30,
    completionTokens: 12,
    totalTokens: 42,
    cost: 0.3,
  });
});
