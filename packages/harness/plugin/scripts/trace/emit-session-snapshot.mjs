// scripts/trace/emit-session-snapshot.mjs
//
// [Role] SessionStart 정적 컨텍스트 snapshot → trace-emit writer
//
// 세션 초반 한 번, 현재 환경의 관측 가능한 정적 구성(rules / skills /
// mcp servers) 을 snapshot 으로 기록한다. Inspector 가 타임라인 상단에
// "세션이 어떤 컨텍스트에서 시작되었나" 를 표시하는 데 사용한다.
//
// [Contract]
// - 모든 경로에서 exit(0).
// - .harness/ 미존재 시 writer 가 silent-skip.
// - 수집 실패(디렉토리 없음 등)는 빈 배열로 대체. snapshot 은 best-effort.

import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { writeTraceRecord } from '../state/trace-emit.mjs';
import { readHookPayload, runTrace } from './_shared.mjs';

const SCRIPT = 'emit-session-snapshot';

function listDirNames(dir) {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

function listFileNames(dir, ext) {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir)
      .filter((n) => n.endsWith(ext))
      .map((n) => n.replace(new RegExp(`${ext}$`), ''))
      .sort();
  } catch {
    return [];
  }
}

function collectSkills(pluginRoot) {
  const skillsDir = resolve(pluginRoot, 'skills');
  return listDirNames(skillsDir).filter((name) =>
    existsSync(join(skillsDir, name, 'SKILL.md'))
  );
}

function collectRules(projectDir) {
  return listFileNames(resolve(projectDir, '.claude/rules'), '.md');
}

/**
 * MCP 서버 목록은 Claude Code settings 에서 추출.
 * 우선순위:
 *   1) ${projectDir}/.claude/settings.local.json
 *   2) ${projectDir}/.claude/settings.json
 * mcpServers 객체의 top-level key 를 이름으로 취급.
 */
function collectMcpServers(projectDir) {
  const candidates = [
    resolve(projectDir, '.claude/settings.local.json'),
    resolve(projectDir, '.claude/settings.json'),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      const raw = readFileSync(path, 'utf8');
      const parsed = JSON.parse(raw);
      const servers = parsed.mcpServers ?? parsed.mcp_servers ?? null;
      if (servers && typeof servers === 'object') {
        return Object.keys(servers).sort();
      }
    } catch {
      // 파싱 실패 - 다음 후보 시도
    }
  }
  return [];
}

runTrace(SCRIPT, async () => {
  const payload = await readHookPayload(SCRIPT);
  // payload 가 null 이어도 snapshot 은 기록 (cwd 가 없으면 env 사용)
  const projectDir = payload?.cwd ?? process.env.CLAUDE_PROJECT_DIR ?? '.';
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT ?? '.';

  writeTraceRecord({
    kind: 'snapshot',
    source: 'SessionStart',
    session_id: payload?.session_id,
    data: {
      rules: collectRules(projectDir),
      skills: collectSkills(pluginRoot),
      mcp_servers: collectMcpServers(projectDir),
      cwd: projectDir,
    },
  });
});
