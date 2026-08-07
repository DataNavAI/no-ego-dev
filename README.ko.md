# NoEgoDev (NED)

[English README](README.md)

NoEgoDev, 줄여서 NED는 간단한 요청을 작동하고 공개 가능한 제품으로 바꿔주는 Hermes 프로필입니다. 제품 방향을 잡고, UI를 디자인하고, 앱을 만들고, QA하고, 퍼블리싱을 준비하고, 과장 없는 마케팅 계획까지 도와줄 수 있습니다.

NED는 아이디어를 빠르게 검증하고 싶은 사람에게 가장 잘 맞습니다. 사용자, 팀원, 고객에게 실제로 보여줄 수 있는 무언가를 빠르게 만들 때 유용합니다.

## 비공개 NED VPS 만들기 (Daytona CLI v1)

지원되는 깨끗한 macOS/Linux x64 또는 arm64 환경에서 아래 한 줄을 실행합니다. 운영체제의 `bash`, `curl`, `tar`, SHA-256 도구만 필요하며 sudo, git, 시스템 Node.js/npm은 필요하지 않습니다.

```bash
i=$(mktemp) && curl -fsSL https://raw.githubusercontent.com/DataNavAI/no-ego-dev/293b103d622ba2fc67018aeaf980246fdea671d6/scripts/install.sh -o "$i" && { echo "ce898f31c3c4f5df645b6ecdc76f22bdd29fbdd7b3dfa9ec21da3b0b9aab300e  $i" | sha256sum -c - 2>/dev/null || echo "ce898f31c3c4f5df645b6ecdc76f22bdd29fbdd7b3dfa9ec21da3b0b9aab300e  $i" | shasum -a 256 -c -; } && bash "$i"; s=$?; rm -f "$i"; (exit "$s")
```

필수 조건은 Daytona 계정과 `write:sandboxes`, `delete:sandboxes`, `manage:secrets` 권한입니다. macOS에서는 서비스 `no-ego-dev/daytona`, 계정 `DAYTONA_API_KEY`인 Keychain 항목을 우선 사용하고, 그 외에는 숨김 터미널 입력을 사용합니다. 비밀값을 채팅이나 명령 인자에 붙여넣지 마세요.

`ned create`는 호환되는 기존 Hermes ChatGPT OAuth 자격 증명을 안전하게 재사용하고, 없으면 고정된 ChatGPT 디바이스 인증 페이지를 한 번 엽니다. 그런 다음 고정 사양의 비공개 영구 Daytona Sandbox를 만들고, 고정 버전의 Hermes와 NED를 설치하고, 네이티브 `openai-codex` 공급자를 설정한 뒤 실제 추론 상태를 확인합니다. OpenRouter는 필요하지 않습니다. “비공개 NED VPS”는 사용자용 표현이며 Daytona API/과금 용어는 Sandbox입니다.

```bash
ned chat "내 제품 아이디어의 가장 작은 유용한 버전을 만들어줘"
ned doctor
ned repair
ned destroy --yes
```

Sandbox는 15분 동안 유휴 상태이면 중지되고 7일 뒤 아카이브됩니다. `chat`과 `doctor`는 중지된 Sandbox를 다시 시작합니다. OAuth 기반 모델 연결에는 ChatGPT 구독/사용 약관이 적용됩니다.

제품 및 보안 계약은 [`docs/ned-create/PRD.md`](docs/ned-create/PRD.md), [`CUJ.md`](docs/ned-create/CUJ.md), [`TECH_SPEC.md`](docs/ned-create/TECH_SPEC.md)를 참고하세요.

## 기존 Hermes 프로필에 설치하기

최소 요구사항: [Hermes Agent](https://hermes-agent.nousresearch.com/docs) v2026.5.16 / v0.14.0 이상. 이 버전 라인이 프로필 배포를 지원하는 첫 릴리스입니다.

1. Hermes Agent를 설치합니다.
2. Hermes를 엽니다.
3. 아래 프롬프트 중 하나를 붙여넣습니다.

```text
Install github.com/knoomdevbot/no-ego-dev on the current profile.
```

```text
Install github.com/knoomdevbot/no-ego-dev on a new profile named no-ego-dev.
```

4. 이제 실용적인 제품 프롬프트로 NED를 사용합니다. 무엇을 검증하고 싶은지, 누구를 위한 것인지, 참고할 URL·스크린샷·벤치마크 제품·공개 목표가 있는지 알려주세요.

NED는 기술 선택을 세세하게 지시할 때보다 원하는 결과를 설명할 때 더 잘 작동합니다. 제품 의도와 참고 사례를 주면, NED가 가장 단순하고 실용적인 방식으로 만들고 공유할 방법을 추론합니다.

## 최소 요구사항

- [Hermes Agent](https://hermes-agent.nousresearch.com/docs) v2026.5.16 / v0.14.0 이상.

## NED가 도와줄 수 있는 일 — 바로 써볼 프롬프트

### 제품 구체화

거친 아이디어, URL, 스크린샷, 벤치마크 제품을 명확한 제품 방향과 공유 가능한 프로토타입으로 바꿉니다.

```text
I want to test this product idea: [idea]. Use [URL] as the benchmark product. Create something simple enough to publish and test with real users.
```

```text
Build a prototype inspired by this website: [URL]. Keep the core user flow, but adapt it for [your audience/problem].
```

### UI 디자인

예시나 스크린샷을 바탕으로 실용적인 UI, 시각 구조, 첫 사용자 흐름을 디자인합니다.

```text
Build a prototype based on these screenshots. Focus on reproducing the main interaction and visual structure, not every detail.
```

```text
Here are screenshots of an app I like. Build a prototype with a similar flow, but for this different use case: [use case].
```

### 빌드

브라우저, 모바일, 게임, 앱 프로토타입을 실제 사용자에게 보여줄 수 있을 만큼 사용할 수 있게 만듭니다.

```text
Create a prototype for this mobile app idea: [idea]. I care most about onboarding, the main interaction, and whether the concept feels useful enough to share.
```

```text
Build a shareable browser game for [audience/use case]. Make the first interaction obvious, include realistic sample content, and keep it simple enough for real users to try.
```

### QA

공개 전에 핵심 사용자 흐름을 점검하고, 사용성 문제를 찾고, 실용적인 수정 방향을 정리합니다.

```text
Review this deployed prototype: [URL]. QA the main user flow, identify the biggest usability issues, and suggest the next practical improvements before I share it publicly.
```

### 퍼블리싱

프로토타입을 공개적으로 공유할 수 있도록 출시 준비와 퍼블리싱 단계를 정리합니다.

```text
Prepare this prototype for launch: [URL or repo]. Check the user flow, write concise launch copy, list publishing steps, and make it ready to share with testers.
```

### 마케팅

스팸성 성장 꼼수 없이 포지셔닝, 런칭 문구, 아웃리치 아이디어, 피드백 루프를 만듭니다.

```text
Create a practical launch plan for this prototype: [URL or repo]. Include positioning, target users, launch copy, outreach ideas, and how we should collect useful feedback.
```

## 포함된 스킬

NED는 아이디어에서 공개 테스트까지 필요한 일반적인 작업을 위한 집중 스킬들을 포함합니다.

- `product-manager`: 모호한 요청을 제품 방향, 대상 사용자, 성공 기준, 프로토타입 범위로 정리합니다.
- `ui-designer`: 실용적인 화면, 인터랙션 흐름, 첫 사용자 경험, 시각 QA 노트를 설계합니다.
- `architect`: 접근 방식을 과하게 복잡하게 만들지 않으면서 빌드 계획과 프로젝트 구조를 잡습니다.
- `project-manager`: 작업을 추적 가능한 단위로 나누고 전문 서브에이전트를 조율하며, 되돌리기 어려운 변경 중심의 첫 라운드 완결 검토와 고정된 라운드 제한 없이 4라운드부터 승인 수렴 모드를 적용합니다.
- `issue-monitor`: 한 번의 제한된 검토 시도, 영구적인 정확한 SHA 결과, 중복 검토 억제, 4라운드 이후 컨트롤러가 결정하는 승인 수렴 모드로 예약된 이슈/PR 워크플로를 실행합니다.
- `delegation-reliability`: 백그라운드 서브에이전트를 감독하고, 영구 인계 결과를 검증하며, 중단되거나 부분 완료된 작업을 안전하게 복구합니다.
- `subagent-driven-development`: 새로 분리된 서브에이전트와 위험 가중 불변 검토 게이트로 구현 계획을 실행합니다.
- `prd-reviewer`: 정확한 PRD 리비전을 독립적으로 검토하고, 되돌리기 어려운 제품 결정을 우선해 첫 라운드에 완전한 수정 방향을 제공합니다.
- `technical-design-reviewer`: 정확한 아키텍처 리비전을 독립적으로 검토해 비가역적 경계, 안전한 마이그레이션·롤백, 제한된 수렴을 확인합니다.
- `ui-reviewer`: 고정된 UI 근거를 독립적으로 검토해 지속적인 여정·디자인 시스템 위험에 집중하고 쉽게 고칠 수 있는 외관상 사소한 사항은 미룹니다.
- `spec-compliance-review`: 고정된 후보를 권위 있는 계획, 계약, 인수 기준 매트릭스에 맞춰 감사하며 첫 라운드에 발견 가능한 피드백을 모으고 3라운드 이후에는 차단 결함 중심의 승인 수렴 모드를 적용합니다.
- `immutable-candidate-verification`: TDD, 후보 정체성, 독립 검토, 릴리스 근거, 제한 없이 단조 증가하는 검토 계보를 정확한 커밋에 결속하며 라운드 소진만으로 승인하지 않습니다.
- `coder`: 제품 변경 사항을 만들며, 프로젝트 소유의 생태계 적합 정적 분석이 없으면 구성하고 모든 코드 변경 후와 최종 전체 검증에서 다시 실행합니다.
- `qa`: 사용자 흐름을 테스트하고, 회귀를 잡고, 근거를 포함해 보고합니다.
- `devops`: 배포, 운영 점검, 도메인, CI/CD, 기본 관측성을 다룹니다.
- `marketer`: 포지셔닝, 채널 계획, 런칭 문구, 아웃리치 노트, 피드백 루프를 만듭니다.
- `play-store-publisher`: Google Play용 Android 앱 퍼블리싱 작업을 준비합니다.
- `play-store-cli`: Google Play CLI/API 워크플로를 지원합니다.
- `integrator`: 외부 도구, 계정, API, 제공자 설정을 조사하고 연결합니다.
- `agent-identity-and-access`: 에이전트 소유 계정, OAuth 접근, 브라우저 SSO, 이메일 아이덴티티 설정을 돕습니다.
- `web-game-dev`: 브라우저 게임과 인터랙티브 웹 경험을 만듭니다.
- `android-app-dev`: 네이티브 Android 앱 작업을 지원합니다.
- `react-native-app-dev`: 크로스플랫폼 모바일 앱 작업을 지원합니다.
- `project-knowledge-organization`: 프로젝트 결정, 노트, 산출물을 정리합니다.
- `skill-creator`: Hermes 스킬을 만들거나 조정합니다.
- `eval-creator`: 스킬과 워크플로용 평가를 만듭니다.
- `profile-skill-harvester`: 실행 중인 NED 프로필의 재사용 가능한 변경을 표준 저장소로 통합하고, 충돌하는 지침을 제품 단계와 사용 사례별로 범위화하며, 검증된 전체 스킬 패키지만 게시합니다.

## Built with NED

NED 워크플로를 통해 만들어진 배포 예시입니다.

- **Korean Ground News** — 실시간 스토리 피드와 제품 모니터링이 포함된 뉴스 분석 제품.
  https://news.datanav.app
- **Budget Table** — 재무 시나리오를 탐색하고 비교하는 예산 계획 제품.
  https://budget.datanav.app
- **Group Game Maker** — 공유 가능한 브라우저 게임/프로토타입 경험.
  https://knoomdevbot.github.io/group-game-maker/

## 평가 실행

평가 러너에는 Python 3.11 이상이 필요합니다.

```bash
python -m eval_runner.cli skills --markdown
```

평가 러너는 `EVAL.yaml`을 발견하고, `.eval-runs/` 아래에 권한이 제한된 격리 Hermes 프로필 폴더를 만들고, 필요한 경우 setup/teardown 명령을 실행하고, 선언된 매개변수와 fixture를 포함한 평가 프롬프트로 Hermes를 호출하고, 기대 조건을 `result.json`으로 판정하고, HTML/Markdown 리포트를 집계합니다. 별도의 Hermes 호환 명령으로 판정하려면 `--judge-command`를 사용합니다. 종료 코드 `2`는 평가 내용의 실패를, 종료 코드 `3`은 러너/프로바이더 인프라 실패로 인해 평가 결과를 확정할 수 없음을 뜻합니다.
평가 러너는 항상 Hermes를 one-shot 모드로 호출합니다. 실제 격리 Hermes 프로필의 동작을 검증해야 하므로 오프라인/정적 통과 모드는 없습니다.

## 라이선스

MIT. [LICENSE](LICENSE)를 참고하세요.
