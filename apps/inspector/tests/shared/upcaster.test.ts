import { describe, it, expect } from 'vitest';
import { upcastRecord, CURRENT_VERSION } from '../../src/shared/upcaster';

const base = {
  v: 1,
  ts: '2026-04-19T10:00:00.000Z',
  session_id: 's1',
  span_id: 'sp-1',
  parent_span_id: null,
  kind: 'tool_pre',
  source: 'PreToolUse',
  tool: 'Bash',
  data: { input: { command: 'ls' } },
};

describe('upcastRecord', () => {
  it('CURRENT_VERSION 은 1', () => {
    expect(CURRENT_VERSION).toBe(1);
  });

  it('v=1 identity — 모든 필드 보존', () => {
    const r = upcastRecord(base);
    expect(r).toMatchObject(base);
  });

  it('v 누락 시 1 로 기본화', () => {
    const r = upcastRecord({ ...base, v: undefined });
    expect(r?.v).toBe(1);
  });

  it('session_id 누락 → _unknown fallback', () => {
    const r = upcastRecord({ ...base, session_id: undefined });
    expect(r?.session_id).toBe('_unknown');
  });

  it('parent_span_id 누락 → null', () => {
    const r = upcastRecord({ ...base, parent_span_id: undefined });
    expect(r?.parent_span_id).toBeNull();
  });

  it('tool 누락 → null', () => {
    const r = upcastRecord({ ...base, tool: undefined });
    expect(r?.tool).toBeNull();
  });

  it('data 누락 → 빈 객체', () => {
    const r = upcastRecord({ ...base, data: undefined });
    expect(r?.data).toEqual({});
  });

  it('kind 누락 → null (invalid)', () => {
    expect(upcastRecord({ ...base, kind: undefined })).toBeNull();
  });

  it('source 누락 → null (invalid)', () => {
    expect(upcastRecord({ ...base, source: undefined })).toBeNull();
  });

  it('ts 누락 → null (invalid)', () => {
    expect(upcastRecord({ ...base, ts: undefined })).toBeNull();
  });

  it('span_id 누락 → null (invalid)', () => {
    expect(upcastRecord({ ...base, span_id: undefined })).toBeNull();
  });

  it('non-object 입력 → null', () => {
    expect(upcastRecord(null)).toBeNull();
    expect(upcastRecord(undefined)).toBeNull();
    expect(upcastRecord('str')).toBeNull();
    expect(upcastRecord(42)).toBeNull();
  });

  it('future v 필드 보존 (passthrough)', () => {
    const r = upcastRecord({ ...base, v: 99 });
    expect(r?.v).toBe(99);
  });

  it('turn 숫자만 보존, 문자열은 undefined', () => {
    expect(upcastRecord({ ...base, turn: 3 })?.turn).toBe(3);
    expect(upcastRecord({ ...base, turn: '3' })?.turn).toBeUndefined();
  });

  it('producer 문자열 보존', () => {
    expect(upcastRecord({ ...base, producer: 'harness' })?.producer).toBe('harness');
  });
});
