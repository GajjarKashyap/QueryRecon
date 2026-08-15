import test from 'node:test';
import assert from 'node:assert/strict';
import { envValue, parseHermesReply, safeLocalEndpoint } from './queryrecon-cli.mjs';

test('accepts only local Hermes endpoints', () => {
  assert.equal(safeLocalEndpoint('http://localhost:8642/'), 'http://localhost:8642');
  assert.throws(() => safeLocalEndpoint('https://example.com'), /localhost/);
});

test('separates returned thinking from the visible answer', () => {
  assert.deepEqual(parseHermesReply({ content: '<think>Check evidence</think>Final answer' }), { content: 'Final answer', thinking: 'Check evidence' });
});

test('reads a quoted Hermes gateway key without exposing other values', () => {
  assert.equal(envValue('OTHER=x\nAPI_SERVER_KEY="local-secret"\n', 'API_SERVER_KEY'), 'local-secret');
});
