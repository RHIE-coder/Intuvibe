// skills/scope/scripts/validate-scope.mjs
//
// [Model Limit Assumption]
// LLM은 Scope 문서의 필수 섹션 누락이나 기술 용어 혼입을 놓칠 수 있다.
// → 결정론적으로 00-overview.md의 구조와 내용을 검증.
//
// [Exit Protocol]
// exit(0) = 검증 통과 (stdout에 결과 JSON)
// exit(2) = 검증 실패 (stderr에 사유)
// exit(1) = 런타임 에러
//
// [Usage]
// HARNESS_OVERVIEW_FILE=.harness/specs/00-overview.md \
//   node validate-scope.mjs

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const projectDir = process.env.CLAUDE_PROJECT_DIR || '.';
const overviewFile = process.env.HARNESS_OVERVIEW_FILE || '.harness/specs/00-overview.md';

// 기술 용어 패턴 — 요구사항 요약에 혼입되면 경고
const TECH_TERMS = [
  /\bDB\b/i,
  /\bDatabase\b/i,
  /\bSQL\b/i,
  /\bNoSQL\b/i,
  /\bMongoDB\b/i,
  /\bPostgreSQL?\b/i,
  /\bMySQL\b/i,
  /\bRedis\b/i,
  /\bAPI\s*endpoint/i,
  /\bREST\s*API\b/i,
  /\bGraphQL\b/i,
  /\bgRPC\b/i,
  /\bWebSocket\b/i,
  /\bframework\b/i,
  /\bReact\b/,
  /\bVue\b/,
  /\bAngular\b/,
  /\bNext\.?js\b/i,
  /\bExpress\b/,
  /\bFastify\b/,
  /\bDjango\b/,
  /\bFlask\b/,
  /\bSpring\b/,
  /\bDocker\b/i,
  /\bKubernetes\b/i,
  /\bK8s\b/i,
  /\bAWS\b/,
  /\bGCP\b/,
  /\bAzure\b/,
  /\bLambda\b/,
  /\bS3\b/,
  /\bEC2\b/,
  /\bschema\b/i,
  /\bORM\b/,
  /\bmiddleware\b/i,
  /\bcontroller\b/i,
  /\brouter\b/i,
  /\bCRUD\b/i,
];

function main() {
  const overviewPath = resolve(projectDir, overviewFile);

  if (!existsSync(overviewPath)) {
    process.stderr.write(`validate-scope: 파일 없음 — ${overviewFile}\n`);
    process.exit(2);
  }

  const raw = readFileSync(overviewPath, 'utf8');
  const errors = [];
  const warnings = [];

  // 1. 필수 섹션 존재 확인
  if (!raw.match(/^##\s+Product\s+Summary/m)) {
    errors.push('Product Summary 섹션 누락');
  }
  if (!raw.match(/^##\s+Domain\s+&\s+Section\s+Map/m)) {
    errors.push('Domain & Section Map 섹션 누락');
  }

  // 2. Status 유효성 확인
  const statusMatch = raw.match(/>\s*\*\*Status\*\*:\s*(.*)/);
  if (!statusMatch) {
    errors.push('Status 메타데이터 누락 (> **Status**: DRAFT | CONFIRMED)');
  } else {
    const status = statusMatch[1].trim();
    if (!['DRAFT', 'CONFIRMED'].includes(status)) {
      errors.push(`Status 값이 유효하지 않음: "${status}" (DRAFT 또는 CONFIRMED만 허용)`);
    }
  }

  // 3. 최소 1개 Domain 존재 확인
  // Domain은 ### 레벨 헤딩으로 Domain & Section Map 아래에 위치
  const domainSectionStart = raw.indexOf('## Domain & Section Map');
  const nextH2 = domainSectionStart >= 0
    ? raw.indexOf('\n## ', domainSectionStart + 1)
    : -1;
  const domainBlock = domainSectionStart >= 0
    ? raw.slice(domainSectionStart, nextH2 >= 0 ? nextH2 : undefined)
    : '';

  const domainHeadings = domainBlock.match(/^###\s+.+/gm) || [];
  if (domainHeadings.length === 0) {
    errors.push('Domain이 최소 1개 이상 필요 (### 레벨 헤딩)');
  }

  // 4. Section 테이블에서 빈 요구사항 확인
  // 테이블 행: | Section명 | 요구사항 요약 | 형식
  const tableRows = domainBlock.match(/^\|[^|]+\|[^|]*\|/gm) || [];
  const dataRows = tableRows.filter((row) => !row.match(/^\|\s*-+\s*\|/) && !row.match(/^\|\s*Section\s*\|/i));

  let sectionCount = 0;
  for (const row of dataRows) {
    // pipe split → 첫/끝 빈 문자열 제거, 내부 빈 셀은 보존
    const rawCells = row.split('|').map((c) => c.trim());
    const cells = rawCells.slice(1, rawCells.length - 1); // 앞뒤 빈 원소 제거
    if (cells.length >= 2) {
      sectionCount++;
      const sectionName = cells[0];
      const requirement = cells[1];
      if (!requirement || requirement === '' || requirement === '-') {
        errors.push(`Section "${sectionName}"에 요구사항 요약이 비어 있음`);
      }
    }
  }

  // 5. 기술 용어 혼입 경고
  for (const row of dataRows) {
    const rawCells = row.split('|').map((c) => c.trim());
    const cells = rawCells.slice(1, rawCells.length - 1);
    if (cells.length >= 2) {
      const sectionName = cells[0];
      const requirement = cells[1];
      for (const pattern of TECH_TERMS) {
        const match = requirement.match(pattern);
        if (match) {
          warnings.push(`Section "${sectionName}" 요구사항에 기술 용어 혼입: "${match[0]}"`);
        }
      }
    }
  }

  // 결과 출력
  if (errors.length > 0) {
    process.stderr.write(`\u26D4 validate-scope: ${errors.length}개 오류\n`);
    for (const err of errors) {
      process.stderr.write(`   - ${err}\n`);
    }
    if (warnings.length > 0) {
      process.stderr.write(`\u26A0\uFE0F  ${warnings.length}개 경고\n`);
      for (const w of warnings) {
        process.stderr.write(`   - ${w}\n`);
      }
    }
    process.exit(2);
  }

  if (warnings.length > 0) {
    process.stderr.write(`\u26A0\uFE0F  validate-scope: ${warnings.length}개 경고 (통과)\n`);
    for (const w of warnings) {
      process.stderr.write(`   - ${w}\n`);
    }
  }

  const result = {
    valid: true,
    domain_count: domainHeadings.length,
    section_count: sectionCount,
    warnings: warnings.length,
    file: overviewFile,
  };
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exit(0);
}

main();
