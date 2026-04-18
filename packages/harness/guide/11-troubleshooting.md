# 11. 트러블슈팅 · FAQ

> 자주 막히는 지점. 증상 → 원인 → 해결 순.

---

## 11.1 Gate 차단

### "Spec 이 없습니다" (G1)

```
/harness:implement auth/login 실행 시
→ "Spec 이 없습니다. `/harness:spec`으로 먼저 명세를 작성하세요."
```

**원인**: `.harness/specs/auth/login.spec.yaml` 이 존재하지 않음.

**해결**:
```
/harness:spec auth/login
```

같은 이름이 이미 있는지:
```
ls .harness/specs/auth/
```

---

### "Plan 이 없습니다" (G2)

**원인**: spec 은 있지만 plan 이 없음.
```
/harness:plan auth/login
```

### "Plan 이 비어있거나 AC 매핑이 불완전합니다" (G6)

**원인**: plan 에 step 이 없거나 일부 AC 가 어떤 step 에도 매핑 안 됨.

**해결**: `{feature}.plan.md` 를 열어 각 AC id 가 최소 하나의 step 에 인용되는지 확인. `/harness:plan --edit` 로 갱신.

### "QA 를 통과하지 못했습니다" (G4)

```
/harness:deploy 실행 시 차단
```

**원인**: `state/workflow.json` 에 `qa.passed=true` 가 없음.

**해결**:
```
/harness:qa <d>/<f>
# 실패하면 implement → review → qa 루프
```

정당한 사유가 있을 땐 **Escape Hatch**:
```
/harness:qa auth/login --exclude load --reason "infra 점검 중"
```
우회는 audit 에 기록된다.

---

## 11.2 Mode 관련

### "`/harness:deploy` 가 막힌다"

**원인**: 현재 mode 가 `prototype` 또는 `explore` — deploy 는 Standard 전용.

**확인**:
```
/harness:mode show
```

**해결 (둘 중 하나)**:

```
/harness:sync --promote             # prototype 에서 역추출 + 승격
/harness:mode set standard          # 수동 전환
```

승격 상세: [§4](04-prototype-to-standard.md).

### "explore 모드인데 Claude 가 스킬을 못 찾는다"

**원인**: explore 는 skill description 을 로드하지 않음 (토큰 절감).

**해결**:
- 직접 호출: `/harness:<name>`
- Standard/Prototype 으로 전환: `/harness:mode set standard`

### "mode auto 로 설정했는데 자동 판정이 안 된다"

**원인**: `determine-mode.mjs` 는 `workflow.json` 에 mode 가 아직 없을 때만 동작. 한 번 확정된 이후엔 no-op.

**해결**: 재판정이 필요하면 수동 전환하거나 `workflow.json` 의 `session.mode` 항목을 제거 후 재시작.

---

## 11.3 Hook 관련

### "Bash 명령이 차단된다"

```
rm -rf / 같은 파괴적 명령 → block-destructive.mjs exit(2)
git push --force → block-force-push.mjs exit(2)
```

**정당한 경우 해결**: 차단은 모든 mode 에서 **항상 작동** — 이 경우 명령을 분해하거나 유저가 직접 터미널에서 실행 (하네스 바깥).

### "Edit/Write 가 `.harness/` 를 수정 못 한다"

**원인**: `protect-harness.mjs` 가 유저 tool 경로로 `.harness/**` 수정 시도를 차단.

**해결**: 목적에 맞는 `/harness:*` 스킬을 써야 함:
- spec 수정 → `/harness:spec --edit`
- plan 수정 → `/harness:plan` 재실행
- config 수정 → 유저가 에디터로 직접 편집 (스킬 밖)
- state/* → **직접 수정 금지**. `/harness:sync` 로 재구성.

### "Hook 이 느리다"

**원인**: 각 hook 스크립트 = 별도 node 프로세스 (subprocess startup 25~30ms). PreToolUse 체인은 누적 ≈ 100ms.

**즉시 완화**:
- Explore 모드 사용 시 일부 hook 생략.
- Trace 스크립트 실패는 tool 을 막지 않으므로 (`runTrace` 가 항상 exit(0)) 무시 가능.

**장기 완화**: Hook batching — v0.4+ 에서 검토.

---

## 11.4 Inspector 관련

### "Inspector 를 띄웠는데 빈 화면"

**원인**: `HARNESS_PROJECT_DIR` 가 가리키는 경로에 `.harness/state/traces/` 가 없음.

**확인**:
```bash
ls $HARNESS_PROJECT_DIR/.harness/state/traces/ 2>&1
```

**해결**:
- 대상 프로젝트에서 하네스 세션을 최소 1회 실행.
- Inspector 는 디렉토리가 생기면 **1초 폴링으로 자동 감지** → Inspector 를 재시작하지 않아도 됨.

### "브라우저가 자동 갱신 안 된다"

**원인**: SSE 연결이 끊겼거나 브라우저 탭이 백그라운드.

**해결**: 페이지 새로고침. 콘솔에 SSE reconnect 로그 확인.

---

## 11.5 Prompt Quality / Auto-Transform

### "내 프롬프트가 변형됐다"

**원인**: `auto-transform.mjs` 가 quality-check 결과로 프롬프트를 정제.

**확인**:
- Inspector PromptDiff 탭에서 before/after 비교.
- `.harness/state/traces/{session_id}.jsonl` 에서 `kind: prompt` + `kind: prompt_transformed` 페어 검색.

**원상 복구**: 원하지 않으면 Explore 모드에서는 quality-check/auto-transform 이 스킵된다.

---

## 11.6 테스트 / QA

### "`--skip` 으로 필수 테스트를 뺐는데 deploy 가 막힌다"

**원인**: `testing.skip_required_policy` 기본값이 `block_deploy` — **테스트는 실행되되 G4 통과 불가**.

**해결**:
- 정당한 skip 이면 `--reason` 을 넣어 audit 기록 → 정책을 `warn` 으로 낮추거나(책임은 유저),
- 실험 프로젝트면 `config.yaml` 의 정책을 `warn` 으로 조정.

### "QA 매트릭스가 너무 무겁다"

**원인**: Right-Size 가 large 로 잡혀 load/stress/recovery 가 모두 필수.

**해결**:
```
/harness:qa auth/login --force-size medium    # 이 호출 1회만
/harness:qa auth/login --exclude load,stress --reason "dev 환경"
```
`--force-size` 는 config 를 영구 변경하지 않고 one-shot.

---

## 11.7 레포 보조 커맨드

```bash
# 하네스 패키지 자체 테스트
find packages/harness/bench/tests -name "*.test.mjs" | xargs node --test

# Inspector 테스트
pnpm test --filter @intuvibe/inspector
```

---

## 11.8 여전히 막히면

1. Inspector Timeline 으로 방금 세션의 hook 발화 확인 ([§9](09-observability.md)).
2. `audit.jsonl` 에서 관련 `result: block` 이벤트 검색.
3. `workflow.json` 의 phase 상태가 기대와 다른지 확인.
4. `git log` 로 최근 변경이 `.harness/` 를 건드렸는지 확인 (`/harness:sync` 필요한지).

---

## 11.9 참고

- Hook 흐름: [§8](08-hook-lifecycle.md)
- Observability: [§9](09-observability.md)
- State 파일 의미: [§10](10-state-directory.md)
- 전체 CLI 레퍼런스: [`../book/06-cli-reference.md`](../book/06-cli-reference.md)

---

[← 이전: 10. State 디렉토리](10-state-directory.md) · [인덱스](README.md)
