# 커비 타이머 — 개발 핸드오프 문서

> 이 문서는 프로토타입을 Electron 데스크탑 앱으로 완성하는 데 필요한
> 모든 컨텍스트를 담고 있습니다. Cursor 워크스페이스에 이 폴더 그대로 열어두면
> AI가 프로젝트 구조와 의도를 빠르게 파악할 수 있습니다.

---

## 0. TL;DR (5분 안에 실행)

```bash
npm install
npm start
```

투명 + 항상 위 + 프레임 없는 창에 커비 두 마리가 일렬로 떠 있으면 정상.

설치파일 빌드:
```bash
npm run build:win     # → dist/Kirby Timer Setup 1.0.0.exe
npm run build:mac     # → dist/Kirby Timer-1.0.0.dmg
```

---

## 1. 프로젝트 개요

**무엇을 만드는가**: Free Timer를 대체하는 데스크탑 타이머 앱.
일반 타이머와 다른 점은 캐릭터(커비)가 데스크탑 위에 떠다니며,
여러 개를 가로로 일렬 정렬해 동시 운영할 수 있다는 점.

**핵심 사용자 시나리오**:
- "점심까지", "퇴근까지" 등 시간 단위가 다른 여러 타이머를 항상 띄워둠
- 작업 중에도 시야 한 구석에 귀여운 캐릭터로 남은 시간을 확인
- 윈도우 창처럼 보이지 않고 캐릭터 자체가 데스크탑에 그려진 듯한 UX

**디자인 원칙**:
- 불필요한 UI 요소 제거 (Free Timer가 어수선했던 점 반영)
- 로우폴리(다각형) 캐릭터 스타일 — 모든 요소가 12각형/8각형 등 다각형
- 호버 시에만 컨트롤 노출
- 타이머 숫자는 캐릭터 몸통 안에 넣어서 실루엣을 깔끔하게 유지

**현재 단계**: 브라우저에서 동작하는 프로토타입 + Electron 통합 코드 완성.
다음 단계: 아이콘 디자인, 빌드 테스트, 배포.

---

## 2. 폴더 구조

```
kirby-timer-electron/
├── package.json          ← 의존성 + electron-builder 설정
├── main.js               ← Electron 메인 프로세스 (창, 트레이, IPC)
├── preload.js            ← 안전한 IPC 브리지
├── renderer/
│   └── index.html        ← UI + 모든 비즈니스 로직 (단일 파일, ~1050줄)
├── characters/           ← 외부 캐릭터 팩 (사용자 추가 영역)
│   ├── manifest.json
│   └── _template/        ← 새 캐릭터 만들 때 복사용 템플릿
│       ├── character.svg
│       └── meta.json
├── assets/
│   ├── README.md         ← 아이콘 만드는 법
│   ├── icon.ico          ← Windows (TODO)
│   ├── icon.icns         ← macOS (TODO)
│   ├── icon.png          ← Linux (TODO)
│   └── tray-icon.png     ← 시스템 트레이 (TODO)
├── dist/                 ← 빌드 결과물 (gitignore)
├── HANDOFF.md            ← 이 문서
├── CHARACTERS.md         ← 캐릭터 추가 가이드
└── README.md
```

---

## 3. 기능 매트릭스

| 기능 | 상태 | 비고 |
|---|---|---|
| 투명 + 프레임 없는 창 | ✅ 구현됨 | `transparent: true, frame: false` |
| 항상 위 (screen-saver level) | ✅ 구현됨 | 다른 alwaysOnTop 창보다도 위 |
| 모든 워크스페이스에서 보이기 | ✅ 구현됨 | macOS Spaces, Windows 가상 데스크탑 대응 |
| 창 위치/크기 영속화 | ✅ 구현됨 | `userData/window-state.json` |
| 시스템 트레이 + 컨텍스트 메뉴 | ✅ 구현됨 | 보이기/숨기기/항상위/종료 |
| 글로벌 단축키 (Ctrl+Shift+K) | ✅ 구현됨 | 창 토글 |
| 외부 캐릭터 폴더 IPC 로드 | ✅ 구현됨 | 패키징 후에도 동작 |
| 단일 인스턴스 락 | ✅ 구현됨 | 두 번째 실행 시 기존 창 포커스 |
| 다중 모니터 좌표 검증 | ✅ 구현됨 | 화면 밖 좌표 무시하고 기본값 사용 |
| 우측 상단 윈도우 컨트롤 | ✅ 구현됨 | 핀/숨기기/닫기 버튼 |
| 자동 업데이트 | ❌ 미구현 | 향후 electron-updater |
| 시작 프로그램 등록 | ❌ 미구현 | TODO |
| 종료 시 토스트 알림 | ❌ 미구현 | TODO (Web Audio 사운드만 존재) |

---

## 4. renderer/index.html 가이드

### 4.1 파일 구조 (~1050줄)

```
[1] CSS (line 1~약 330)
    - CSS 변수: --kirby-pink-*, --magic-*
    - top-bar (호버 시 진해지는 우상단 컨트롤)
    - 카드 레이아웃, 캐릭터 스테이지, 진행률 링
    - 시간 텍스트 (몸통 내부 absolute)
    - 모달 스타일

[2] 전역 SVG <defs> (line 약 365~395)
    - magicGrad: 진행률 링용 마법 그라데이션
      (stop 색상 6초 순환 + transform 8초 회전)

[3] HTML body (line 약 410~450)
    - top-bar (+ 추가, 핀, 숨기기, 닫기)
    - #row 컨테이너 (타이머 카드들)
    - 모달 (캐릭터 선택, 시간 입력, 사운드 토글)

[4] JavaScript (line 약 460~끝)
    - CHARACTERS 레지스트리
    - getDefaultKirbySVG() — 커비 SVG 본체
    - injectCharSVG() — ID prefix 자동 부여
    - Web Audio 종료 사운드
    - makeTimer() — 카드 생성
    - tick() — requestAnimationFrame 루프
    - localStorage 영구 저장
    - Electron 통합 (window.kirbyAPI 분기)
```

### 4.2 데이터 모델

```js
// timers 배열의 각 원소
const t = {
  id: 1,
  totalSec: 5400,        // 초기 설정값 (1시간 30분)
  remainingSec: 5400,    // 매 프레임 갱신
  running: false,
  complete: false,
  soundOn: true,
  character: 'kirby',    // CHARACTERS의 키
  el: HTMLElement,
  lastTick: number       // performance.now()
};
```

`localStorage` 키: `kirbyTimers_v3`. 스키마 변경 시 버전 올릴 것.

### 4.3 캐릭터 시스템

캐릭터 SVG는 두 가지 방법으로 등록:

**방법 A — 인라인 (코드에 직접)**
```js
const CHARACTERS = {
  kirby: { name: '커비', svg: getDefaultKirbySVG() },
  poyo: { name: '뽀요', svg: `<svg ...> ... </svg>` },
};
```

**방법 B — 외부 폴더 (Electron 패키징 후 권장)**
```
characters/
├── manifest.json       — { "characters": ["poyo"] }
└── poyo/
    ├── character.svg
    └── meta.json       — { "name": "뽀요" }
```

main.js의 `characters:list` IPC가 fs로 읽어 renderer에 전달.
file:// fetch 제한 우회.

자세한 작업 흐름은 `CHARACTERS.md` 참조.

### 4.4 디자인 좌표 시스템 (200×200 viewBox)

| 요소 | 좌표 |
|---|---|
| 몸통 중심 | (100, 100) |
| 몸통 12각형 반지름 | 65 |
| 몸통 top vertex | (100, 35) |
| 몸통 좌/우 | (35, 100), (165, 100) |
| 헤드밴드 폴리라인 | 몸통 vertex와 동일 좌표 (빈공간 0) |
| 헤드셋 컵 직선면 | x=42, x=158 (몸 가장자리 안쪽) |
| 컵 별 perspective | translate + rotate(±15) + scale(0.65, 0.95) |
| 발 | cy=153, 팔자 ±22°, 살짝 띄움 |
| 눈 중심 | (85, 98), (115, 98), 10각형 |
| 입 (default) | y=117 |

새 캐릭터는 위 비율 따르면 헤드셋 등 공유 요소가 자연스럽게 맞음.

### 4.5 핵심 함수

| 함수 | 역할 |
|---|---|
| `makeTimer(opts)` | 타이머 카드 생성 + timers 배열 추가 |
| `setCharacter(t, charId)` | 카드의 SVG 교체 |
| `injectCharSVG(svg, container)` | SVG 삽입 + ID 충돌 방지 |
| `findAnchor(root, anchor)` | 카드 안에서 anchor ID로 요소 찾기 |
| `renderTimer(t)` | 시간 텍스트, 진행률 링, 클래스 갱신 |
| `tick()` | RAF 루프, 모든 활성 타이머 업데이트 |
| `playKirbyDoneSound()` | Web Audio 5음계 알림음 |
| `spawnSparkles(t)` | 종료 시 별 입자 |
| `startBlinkLoop(t)` | 깜빡임 무한 루프 |
| `loadExternalCharacters()` | Electron IPC 우선, fetch fallback |

---

## 5. main.js 가이드

### 5.1 창 옵션

```js
new BrowserWindow({
  transparent: true,           // 배경 투명
  frame: false,                // 윈도우 테두리 X
  alwaysOnTop: true,
  hasShadow: false,            // 투명 영역 그림자 X
  backgroundColor: '#00000000',
  webPreferences: {
    preload, contextIsolation: true, sandbox: true,
  },
});

mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
mainWindow.setAlwaysOnTop(true, 'screen-saver');
```

### 5.2 창 드래그

renderer body에 `-webkit-app-region: drag` 적용 (이미 구현됨).
빈 영역 드래그하면 창 이동. 인터랙티브 요소는 `no-drag`.

### 5.3 IPC 채널 (preload.js로 노출)

```js
window.kirbyAPI.closeWindow()                  // void
window.kirbyAPI.minimizeWindow()               // void
window.kirbyAPI.hideWindow()                   // void
window.kirbyAPI.toggleAlwaysOnTop()            // Promise<boolean>
window.kirbyAPI.isAlwaysOnTop()                // Promise<boolean>
window.kirbyAPI.listCharacters()               // Promise<{ manifest, characters }>
window.kirbyAPI.openCharactersFolder()         // Promise<string>
window.kirbyAPI.platform                       // 'win32' | 'darwin' | 'linux'
```

브라우저 환경에서는 `window.kirbyAPI`가 undefined이므로 분기 처리.
모든 호출 지점에서 옵셔널 체이닝 사용 중.

### 5.4 글로벌 단축키

`Ctrl/Cmd + Shift + K` — 창 보이기/숨기기 토글.
변경하려면 main.js의 `registerGlobalShortcuts()` 수정.

### 5.5 영속화 위치

- 창 상태: `app.getPath('userData')/window-state.json`
- 타이머 상태: 브라우저 localStorage (key: `kirbyTimers_v3`)
- 사용자 추가 캐릭터: `app.getPath('userData')/characters/` (선택)

`userData` 위치:
- Windows: `%APPDATA%\Kirby Timer\`
- macOS: `~/Library/Application Support/Kirby Timer/`
- Linux: `~/.config/Kirby Timer/`

---

## 6. 빌드 (electron-builder)

### 6.1 빌드 전 체크리스트
- [ ] `assets/icon.ico`, `icon.icns`, `icon.png`, `tray-icon.png` 모두 준비됨 (assets/README.md 참고)
- [ ] `package.json`의 `appId`, `author`를 본인 정보로 변경
- [ ] `npm start`로 한 번 실행해서 동작 확인

### 6.2 빌드 명령

```bash
npm run pack         # 디렉터리만 (테스트용, 빠름)
npm run build:win    # Windows NSIS installer
npm run build:mac    # macOS DMG (코드사이닝 인증서 있으면 함께 빌드됨)
npm run build:linux  # Linux AppImage + deb
npm run build:all    # 모든 플랫폼 (해당 OS에서 또는 CI에서)
```

결과물은 `dist/` 폴더에 생성됨.

### 6.3 macOS 코드 사이닝

배포 시 Apple Developer 계정 + 인증서 필요. 없으면 사용자가
"확인되지 않은 개발자" 경고를 보지만 우클릭 → 열기로 실행 가능.

```bash
export CSC_LINK=path/to/cert.p12
export CSC_KEY_PASSWORD=password
npm run build:mac
```

### 6.4 Windows 코드 사이닝

EV 인증서 또는 OV 인증서. 없으면 SmartScreen 경고. 무시하고 실행 가능.

---

## 7. TODO (우선순위 순)

### 🔴 즉시
- [ ] **앱 아이콘 디자인** — 헤드폰 낀 커비. assets/ 채우기
- [ ] **첫 빌드 테스트** — `npm run build:win` 실행, 설치파일 검증
- [ ] **package.json 식별자 변경** — `appId`, `author`, `productName`

### 🟡 곧
- [ ] **창 닫기 → 트레이로 숨기기** — X 누르면 종료 대신 hide (옵션화)
- [ ] **OS 네이티브 알림** — 종료 시 Notification API
- [ ] **자동 시작 옵션** — 모달 설정에 토글 추가:
  ```js
  app.setLoginItemSettings({ openAtLogin: true })
  ```
- [ ] **DevTools 단축키 차단** — production 빌드에서 F12 막기

### 🟢 나중
- [ ] **자동 업데이트** — `electron-updater` + GitHub Releases
- [ ] **새 캐릭터 추가** — Figma 디자인 → CHARACTERS.md 절차 따라
- [ ] **OO시까지 모드** — 절대 시간 입력
- [ ] **포모도로 사이클** — 25/5분 자동 반복
- [ ] **드래그 정렬** — 카드 순서 바꾸기

---

## 8. 알려진 이슈 & 주의사항

### 8.1 투명창 + alwaysOnTop
- **macOS**: Mission Control 진입 시 일부 동작 다름
- **Linux Wayland**: 투명도가 컴포지터에 따라 동작 다름. X11에선 OK
- **Windows**: `hasShadow: false` 필수 (안 그러면 사각 그림자가 투명 영역에)

### 8.2 Web Audio 자동 재생
첫 사용자 제스처 후 가능. 이미 첫 클릭 시 `getAudioCtx()` 호출하여 활성화.

### 8.3 한글 폰트
Google Fonts CDN (Jua, Gaegu) 사용. Electron에서도 인터넷 연결되면 OK.
오프라인 지원 원하면 `assets/fonts/`에 .woff2 두고 `@font-face` 로컬 참조.

### 8.4 빌드 경고 (코드사이닝 없을 때)
- Windows: SmartScreen "Unknown publisher" → 사용자가 "추가 정보" → "실행"
- macOS: Gatekeeper 차단 → 사용자가 우클릭 → 열기
배포가 아닌 개인용이면 무시 OK.

### 8.5 Electron 33 버전
package.json은 Electron 33+를 지정. Node 16 이상 필요.
Cursor에서 의존성 설치 후 첫 실행이 느릴 수 있음 (Chromium 다운로드).

---

## 9. Cursor 첫 세션 체크리스트

핸드오프 직후:
1. ☐ 폴더 전체를 Cursor 워크스페이스로 열기
2. ☐ `HANDOFF.md`(이 파일)와 `CHARACTERS.md` 읽기
3. ☐ `npm install` 실행
4. ☐ `npm start` 로 프로토타입 작동 확인 (커비 두 마리 + 빈 영역 드래그)
5. ☐ 우상단 핀/숨기기/닫기 버튼 동작 확인
6. ☐ + 버튼으로 새 타이머 → 시간 설정 → 시작/종료 → 사운드 + 별 효과
7. ☐ 앱 종료 후 재시작 시 창 위치/타이머 복원되는지 확인
8. ☐ TODO 🔴 부터 작업 시작

---

## 10. 디자인 결정 히스토리

향후 수정 시 참고할 컨텍스트:

- **헤드셋 D자**: 옆에서 본 헤드폰 모양. 안쪽 면(머리 쪽)은 컵 안쪽으로 휘어 쿠션 느낌
- **헤드밴드 폴리라인**: 12각형 몸통 vertex를 그대로 지나는 선. 원호로 하면 12각형과 빈공간 발생
- **헤드밴드 검정 단일색**: 골드 트림 제거 → 몸통 핑크와 명확히 분리
- **몸통 그라데이션**: `#ffc8de` → `#ffabd0`. 톤 차이 좁혀 은은하게 (이전엔 너무 강함)
- **시간 숫자**: 몸통 내부 작은 텍스트. 외곽 실루엣 깔끔
- **idle 애니메이션 없음**: 정적이 깔끔. running 시 호흡, 종료 시 점프만
- **별 perspective**: 헤드셋 컵 측면이라 정면에서 압축+회전 (`scale(0.65,0.95) rotate(±15)`)
- **카드 사이 간격 0**: 일렬로 딱 붙는 게 깔끔. 하트 분리자 제거
- **로우폴리 일관성**: 몸 12각, 발 10각, 눈 10각, 팔 8각

---

질문이나 막히는 부분 있으면 이 문서를 Cursor에 첨부하고 물어보세요.
대부분의 컨텍스트가 여기 들어 있으니 AI가 자체적으로 이해 가능합니다.
