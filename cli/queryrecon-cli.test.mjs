import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHermesReply, safeLocalEndpoint } from './queryrecon-cli.mjs';

test('accepts only local Hermes endpoints', () => {
  assert.equal(safeLocalEndpoint('http://localhost:8642/'), 'http://localhost:8642');
  assert.throws(() => safeLocalEndpoint('https://example.com'), /localhost/);
});

test('separates returned thinking from the visible answer', () => {
  assert.deepEqual(parseHermesReply({ content: '<think>Check evidence</think>Final answer' }), { content: 'Final answer', thinking: 'Check evidence' });
});
