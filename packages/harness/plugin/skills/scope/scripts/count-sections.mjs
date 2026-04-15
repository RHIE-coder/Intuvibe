// skills/scope/scripts/count-sections.mjs
//
// [Model Limit Assumption]
// LLM은 Domain/Section 수를 정확히 세지 못할 수 있다.
// → 00-overview.md에서 Domain 수와 Section 수를 결정론적으로 파싱.
//
// [Exit Protocol]
// exit(0) = 파싱 성공 (stdout에 결과 JSON)
// exit(1) = 런타임 에러 (파일 없음 등)
//
// [Usage]
// HARNESS_OVERVIEW_FILE=.harness/specs/00-overview.md \
//   node count-sections.mjs

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const projectDir = process.env.CLAUDE_PROJECT_DIR || '.';
const overviewFile = process.env.HARNESS_OVERVIEW_FILE || '.harness/specs/00-overview.md';

function main() {
  const overviewPath = resolve(projectDir, overviewFile);

  if (!existsSync(overviewPath)) {
    process.stderr.write(`count-sections: 파일 없음 — ${overviewFile}\n`);
    process.exit(1);
  }

  const raw = readFileSync(overviewPath, 'utf8');

  // Domain & Section Map 블록 추출
  const domainSectionStart = raw.indexOf('## Domain & Section Map');
  if (domainSectionStart < 0) {
    process.stderr.write('count-sections: Domain & Section Map 섹션을 찾을 수 없음\n');
    process.exit(1);
  }

  const nextH2 = raw.indexOf('\n## ', domainSectionStart + 1);
  const domainBlock = raw.slice(domainSectionStart, nextH2 >= 0 ? nextH2 : undefined);

  // Domain 수: ### 레벨 헤딩
  const domainHeadings = domainBlock.match(/^###\s+(.+)/gm) || [];
  const domains = domainHeadings.map((h) => h.replace(/^###\s+/, '').trim());

  // Section 수: 테이블 데이터 행 (헤더와 구분선 제외)
  const tableRows = domainBlock.match(/^\|[^|]+\|[^|]*\|/gm) || [];
  const dataRows = tableRows.filter(
    (row) => !row.match(/^\|\s*-+\s*\|/) && !row.match(/^\|\s*Section\s*\|/i)
  );

  const sections = [];
  for (const row of dataRows) {
    const rawCells = row.split('|').map((c) => c.trim());
    const cells = rawCells.slice(1, rawCells.length - 1); // 앞뒤 빈 원소 제거
    if (cells.length >= 1 && cells[0]) {
      sections.push(cells[0]);
    }
  }

  const result = {
    domain_count: domains.length,
    section_count: sections.length,
    domains,
    sections,
    file: overviewFile,
  };
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exit(0);
}

main();
