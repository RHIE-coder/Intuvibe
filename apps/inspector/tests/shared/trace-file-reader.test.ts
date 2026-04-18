import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import {
  readTraceFile,
  parseJsonl,
  parseAppended,
} from '../../src/shared/trace-file-reader';
import { createTmpProject, makeRecord, type TmpProject } from '../_fixtures/tmp-project';

describe('parseJsonl', () => {
  it('빈 문자열 → []', () => {
    expect(parseJsonl('')).toEqual([]);
  });

  it('공백 라인 건너뜀', () => {
    const body = '\n\n   \n' + JSON.stringify(makeRecord()) + '\n';
    expect(parseJsonl(body)).toHaveLength(1);
  });

  it('깨진 JSON 라인은 건너뛰고 나머지 유효 레코드 반환', () => {
    const good = makeRecord({ span_id: 'sp-1' });
    const body = `${JSON.stringify(good)}\n{broken json\n${JSON.stringify(good)}\n`;
    const parsed = parseJsonl(body);
    expect(parsed).toHaveLength(2);
  });

  it('upcaster 가 invalid 로 판정하면 drop', () => {
    const body = JSON.stringify({ kind: 'x' }) + '\n'; // ts, span_id 없음
    expect(parseJsonl(body)).toEqual([]);
  });
});

describe('readTraceFile', () => {
  let proj: TmpProject;
  beforeEach(() => { proj = createTmpProject(); });
  afterEach(() => { proj.cleanup(); });

  it('존재하지 않는 경로 → []', () => {
    expect(readTraceFile(resolve(proj.tracesDir, 'nope.jsonl'))).toEqual([]);
  });

  it('JSONL 파일 → TraceRecord[]', () => {
    const records = [makeRecord({ span_id: 'a' }), makeRecord({ span_id: 'b' })];
    const path = proj.writeSession('s1', records);
    expect(readTraceFile(path)).toHaveLength(2);
  });
});

describe('parseAppended', () => {
  it('이전 길이 이하 → 빈 배열', () => {
    const raw = JSON.stringify(makeRecord()) + '\n';
    expect(parseAppended(raw, raw.length).records).toEqual([]);
    expect(parseAppended(raw, raw.length + 10).records).toEqual([]);
  });

  it('증분만 파싱', () => {
    const first = JSON.stringify(makeRecord({ span_id: 'a' })) + '\n';
    const second = JSON.stringify(makeRecord({ span_id: 'b' })) + '\n';
    const raw = first + second;
    const { records, newLength } = parseAppended(raw, first.length);
    expect(records).toHaveLength(1);
    expect(records[0].span_id).toBe('b');
    expect(newLength).toBe(raw.length);
  });
});
