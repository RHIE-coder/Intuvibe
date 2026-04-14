# Computer Use Tool

---

스크린샷 + 마우스/키보드 제어로 데스크탑 환경과 자율 상호작용하는 클라이언트 툴.

- 버전: `computer_20251124` (Opus 4.6, Sonnet 4.6, Opus 4.5) / `computer_20250124` (이전 Claude 4/3.7)
- 베타 헤더 필수: `computer-use-2025-11-24` / `computer-use-2025-01-24`
- ZDR: ✅ 지원 (클라이언트 사이드, 스크린샷 실시간 처리 후 미보관)
- 스키마리스 툴

---

## 1. 툴 파라미터

| 파라미터 | 필수 | 설명 |
|---------|------|------|
| `type` | ✅ | `computer_20251124` 또는 `computer_20250124` |
| `name` | ✅ | `"computer"` 고정 |
| `display_width_px` | ✅ | 디스플레이 너비 (픽셀) |
| `display_height_px` | ✅ | 디스플레이 높이 (픽셀) |
| `display_number` | ❌ | X11 디스플레이 번호 |
| `enable_zoom` | ❌ | zoom 액션 활성화 (`_20251124`만, 기본 false) |

---

## 2. 지원 액션

### 기본 (전 버전)
- `screenshot`: 현재 화면 캡처
- `left_click`: 좌표 클릭 `[x, y]`
- `type`: 텍스트 입력
- `key`: 키/단축키 입력 (e.g. `"ctrl+s"`)
- `mouse_move`: 커서 이동

### 확장 (`_20250124`: Claude 4/Sonnet 3.7)
- `scroll`: 방향별 스크롤 (`scroll_direction`, `scroll_amount`)
- `left_click_drag`: 클릭+드래그
- `right_click`, `middle_click`, `double_click`, `triple_click`
- `left_mouse_down`, `left_mouse_up`: 세밀한 클릭 제어
- `hold_key`: 키 유지 (초 단위)
- `wait`: 액션 간 대기

### 추가 (`_20251124`: Opus 4.6, Sonnet 4.6, Opus 4.5)
- `zoom`: 특정 화면 영역 확대 `region: [x1, y1, x2, y2]` (`enable_zoom: true` 필요)

### 수정자 키 조합
```json
{"action": "left_click", "coordinate": [500, 300], "text": "shift"}  // shift+클릭
{"action": "left_click", "coordinate": [500, 300], "text": "ctrl"}   // ctrl+클릭
```

---

## 3. 비용

| 항목 | 토큰 |
|------|------|
| 시스템 프롬프트 오버헤드 | 466–499 토큰 |
| 툴 정의 (Claude 4.x) | 735 토큰 |
| 스크린샷 이미지 | Vision 가격 기준 별도 |

---

## 4. 에이전트 루프

```python
while True and iterations < max_iterations:  # 무한루프 방지 필수
    response = client.beta.messages.create(...)
    tool_results = process_tool_calls(response)
    if not tool_results:
        break  # 툴 미사용 = 태스크 완료
    messages.append({"role": "user", "content": tool_results})
```

---

## 5. 좌표 스케일링

API 이미지 제한: 최장 엣지 1568px, 총 115만 픽셀. 고해상도 스크린샷은 자동 다운샘플링 → Claude 좌표가 축소 이미지 기준 → 원본 화면 클릭 시 오차 발생.

**해결**: 직접 리사이즈 후 스케일 팩터로 역변환.

```python
scale = min(1.0, 1568/max(w,h), sqrt(1_150_000/(w*h)))
# 전송: scaled_width, scaled_height으로 리사이즈
# 실행: x/scale, y/scale로 역변환
```

---

## 6. 보안

**주요 위협**:
- **프롬프트 인젝션**: 웹페이지/이미지 내 지시문이 사용자 지시를 override 가능
  - 대응: 자동 분류기 적용 (주입 감지 시 사용자 확인 요청). opt-out 가능
- **직접 시스템 공격**: VM/Docker 격리 필수
- **민감 데이터 노출**: 로그인 정보 최소화, 금융/동의 필요 작업 인간 확인

**권장 사항**:
- 최소 권한 VM/컨테이너 사용
- 도메인 얼로우리스트로 인터넷 접근 제한
- 실제 결과가 생기는 작업(금융, ToS 동의 등) 인간 확인 의무화

---

## 7. 한계

| 항목 | 설명 |
|------|------|
| 레이턴시 | 인간 직접 조작 대비 느림 |
| 좌표 정확도 | 할루시네이션으로 좌표 오류 가능 |
| 인터랙티브 앱 | 드롭다운·스크롤바 조작 어려울 수 있음 |
| SNS 계정 생성 | 제한적 지원 |
| 인터랙티브 명령 | `vim`, `less`, 비밀번호 프롬프트 불가 |

---

## 8. 프롬프트 팁

- 단순·명확한 태스크로 분해
- `"After each step, take a screenshot and carefully evaluate if you have achieved the right outcome."` 추가로 가정 검증
- UI 조작 어려울 시 키보드 단축키 사용 유도
- 성공 예시 스크린샷 + 툴 호출 포함
- 시스템 프롬프트에 명시적 팁 제공

---

> [insight] Computer use의 좌표 스케일링 문제는 하네스에서 반드시 처리해야 할 버그다. 1512x982 같은 고해상도 화면을 그냥 넘기면 Claude 좌표가 ~12% 오차를 가지게 된다. 하네스의 computer use 구현에서 `get_scale_factor()` 헬퍼를 공통 유틸리티로 제공해야 한다.

> [insight] 에이전트 루프에 `max_iterations` 제한은 하네스의 비용 안전장치로 필수다. computer use는 스크린샷마다 Vision 토큰이 발생하고 루프가 무한정 돌 수 있다. 하네스에서 `max_iterations`를 플러그인 설정으로 노출하되 기본값을 보수적으로(10~20회) 설정해야 한다.

> [insight] 프롬프트 인젝션 자동 분류기(주입 감지 시 사용자 확인 요청)는 하네스의 보안 아키텍처에서 중요한 레이어다. 그러나 분류기가 100% 완벽하지 않으므로, 하네스에서 민감 작업(로그인, 금융, 파일 삭제)은 추가 인간 확인 레이어를 별도로 구현해야 한다.

> [insight] `zoom` 액션(`_20251124`)은 하네스의 문서 분석·UI 검사 에이전트에서 핵심이다. 작은 텍스트나 복잡한 UI 요소를 정확히 인식해야 할 때, 전체 스크린샷 대신 특정 영역을 확대해 분석하면 Claude의 시각적 정확도를 크게 향상시킬 수 있다.

> [insight] `enable_zoom: true` + zoom 액션 + 좌표 스케일링의 상호작용에 주의해야 한다. zoom은 화면의 특정 영역을 full resolution으로 보는 기능이므로, zoom 결과에서 나온 좌표는 원본 화면 좌표계와 다를 수 있다. 하네스 구현에서 zoom 결과 좌표를 처리하는 별도 변환 로직이 필요할 수 있다.
