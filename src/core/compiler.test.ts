import { describe, it, expect } from 'vitest';
import { compileQuery } from './compiler';
import type { QueryNode } from './query';

describe('compiler', () => {
  it('compiles a simple term', () => {
    const node: QueryNode = { id: '1', type: 'term', value: 'password' };
    expect(compileQuery(node)).toBe('password');
  });

  it('handles negated term', () => {
    const node: QueryNode = { id: '1', type: 'term', value: 'password', negated: true };
    expect(compileQuery(node)).toBe('-password');
  });

  it('compiles operator', () => {
    const node: QueryNode = { id: '1', type: 'operator', operator: 'site', value: 'example.com' };
    expect(compileQuery(node)).toBe('site:example.com');
  });

  it('handles AND group', () => {
    const node: QueryNode = {
      id: 'root',
      type: 'group',
      booleanOp: 'AND',
      children: [
        { id: '1', type: 'term', value: 'admin' },
        { id: '2', type: 'operator', operator: 'site', value: 'example.com' },
      ],
    };
    expect(compileQuery(node)).toBe('admin site:example.com');
  });

  it('handles OR group', () => {
    const node: QueryNode = {
      id: 'root',
      type: 'group',
      booleanOp: 'OR',
      children: [
        { id: '1', type: 'term', value: 'admin' },
        { id: '2', type: 'term', value: 'login' },
      ],
    };
    expect(compileQuery(node)).toBe('admin OR login');
  });

  it('wraps OR inside AND', () => {
    const node: QueryNode = {
      id: 'root',
      type: 'group',
      booleanOp: 'AND',
      children: [
        { id: '1', type: 'operator', operator: 'site', value: 'example.com' },
        {
          id: '2',
          type: 'group',
          booleanOp: 'OR',
          children: [
            { id: '3', type: 'term', value: 'admin' },
            { id: '4', type: 'term', value: 'login' },
          ],
        },
      ],
    };
    expect(compileQuery(node)).toBe('site:example.com (admin OR login)');
  });

  it('handles NOT group', () => {
    const node: QueryNode = {
      id: 'root',
      type: 'group',
      booleanOp: 'AND',
      negated: true,
      children: [
        { id: '1', type: 'term', value: 'admin' },
        { id: '2', type: 'term', value: 'login' },
      ],
    };
    expect(compileQuery(node)).toBe('-(admin login)');
  });

  it('handles nested NOT with OR', () => {
    const node: QueryNode = {
      id: 'root',
      type: 'group',
      booleanOp: 'AND',
      children: [
        { id: '1', type: 'operator', operator: 'site', value: 'example.com' },
        {
          id: '2',
          type: 'group',
          booleanOp: 'OR',
          negated: true,
          children: [
            { id: '3', type: 'term', value: 'admin' },
            { id: '4', type: 'term', value: 'login' },
          ],
        },
      ],
    };
    expect(compileQuery(node)).toBe('site:example.com -(admin OR login)');
  });
});
