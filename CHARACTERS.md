# 캐릭터 추가 가이드

새 캐릭터를 만들어서 커비 타이머에 추가하는 방법.

## 1. Figma에서 디자인

### 캔버스 설정
- 새 프레임 200×200 px
- 배경 투명 (필요 시 데스크탑 색 placeholder만 표시)

### 비율 가이드 (Kirby 좌표 기준)
새 캐릭터가 헤드셋 등 공유 요소와 잘 어울리려면 다음 비율 권장:

| 요소 | 권장 위치 |
|---|---|
| 몸통 중심 | (100, 100) |
| 몸통 크기 | 반지름 60~70 |
| 몸통 top vertex | y ≈ 35 |
| 발 | cy ≈ 153, 팔자로 ±22° 회전 |
| 눈 중심 | y ≈ 95~100 |
| 입 | y ≈ 117~120 |
| 양 손 끝 | x ≈ 20, x ≈ 180 |

### 레이어 이름 규칙 ⭐ 가장 중요

각 그룹/레이어의 이름을 정확히 아래처럼 지정.
Figma 레이어 이름이 SVG export 시 `id="..."`로 변환됨.

| 레이어명 | 역할 | 필수 여부 |
|---|---|---|
| `kt-body` | 몸통 (얼굴 외곽) | ✅ 필수 |
| `kt-eyes-open` | 평소 눈 (그룹) | 권장 |
| `kt-eyes-closed` | 감은 눈 (display:none) | 깜빡임 원하면 |
| `kt-mouth-default` | 평소 입 | 권장 |
| `kt-mouth-celebration` | 종료 시 표정 (display:none) | 종료 애니 원하면 |
| `kt-arm-left` | 왼팔 | 향후 |
| `kt-arm-right` | 오른팔 | 향후 |
| `kt-feet` | 발 (그룹) | 자유 |
| `kt-cheeks` | 볼 (그룹) | 자유 |
| `kt-headset` | 헤드셋 | 자유 (커비 전용) |

**`kt-` prefix 필수**: 코드의 `injectCharSVG()`가 ID 충돌 방지를 위해
모든 ID에 `c1_`, `c2_` 같은 unique prefix를 자동으로 덧붙임.
`findAnchor()`는 suffix 매칭으로 찾으므로 prefix가 붙어도 동작.

### 로우폴리 스타일
프로젝트 일관성을 위해 다각형 사용 권장:
- 몸통: 12각형
- 발: 8~10각형 타원
- 눈: 10각형 타원
- 별/액세서리: 정확한 polygon

## 2. SVG Export

1. 프레임 선택
2. 우측 패널 **Export**
3. 형식: **SVG**
4. 옵션:
   - ✅ **Include "id" attribute** ← 이게 켜져있어야 레이어명이 ID로 변환됨!
   - ✅ Outline text (텍스트 있다면)
   - 나머지 기본값

## 3. 코드에 등록

### 방법 A: 인라인 등록 (가장 간단, 즉시 적용)

`renderer/index.html` 의 `CHARACTERS` 객체에 추가:

```js
const CHARACTERS = {
  kirby: { name: '커비', svg: getDefaultKirbySVG() },

  // ↓ 새 캐릭터 추가
  poyo: {
    name: '뽀요',
    svg: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- Figma에서 export한 SVG 내용 통째로 -->
    </svg>`,
  },
};
```

설정 모달의 캐릭터 선택창에 자동으로 추가됨.

### 방법 B: 폴더에서 자동 로드 (Electron 빌드 후 권장)

```
characters/
├── manifest.json
└── poyo/
    ├── character.svg     ← Figma에서 export한 파일 그대로
    └── meta.json
```

`manifest.json`:
```json
{
  "characters": ["poyo", "cookie"]
}
```

`characters/poyo/meta.json`:
```json
{
  "name": "뽀요"
}
```

앱 시작 시 자동 fetch. 캐릭터 추가는 폴더만 떨구면 끝.
> 단: file:// 에서는 fetch 제한으로 동작 안 됨. Electron에서 `app://` protocol 등록 필요 (HANDOFF.md TODO 참조)

## 4. 디자인 일관성 팁

### 어울리는 그라데이션 톤 좁히기
```svg
<radialGradient id="bodyG" cx="40%" cy="35%" r="65%">
  <stop offset="0%"  stop-color="#밝은톤"/>
  <stop offset="100%" stop-color="#어두운톤"/>  <!-- 너무 큰 차이 X -->
</radialGradient>
```
밝은톤과 어두운톤의 명도 차이를 작게 (HSL에서 L값 10~15 차이) 잡으면
은은하고 고급스러움.

### 라인 캐릭터 (먼작귀 스타일)
모든 polygon에 stroke 추가:
```svg
<polygon points="..." fill="white" stroke="#1a1a1a" stroke-width="2.5" stroke-linejoin="round"/>
```

### 깜빡임 작동시키기
`kt-eyes-closed` 그룹을 처음에 숨김으로 설정:
```svg
<g id="kt-eyes-closed" style="display:none">
  <path d="M 80 96 Q 85 90 90 96" stroke="..." stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M 110 96 Q 115 90 120 96" stroke="..." stroke-width="2.5" fill="none" stroke-linecap="round"/>
</g>
```
JavaScript의 `startBlinkLoop()`이 자동으로 `display`를 토글.

### 종료 표정도 마찬가지
```svg
<path id="kt-mouth-celebration" d="..." style="display:none"/>
```
JS의 `applyMouthState()`가 종료 시 자동으로 노출.

## 5. 디버깅

새 캐릭터가 깜빡이지 않거나 표정이 안 바뀐다면:
1. SVG 안의 ID가 정확히 `kt-eyes-open`, `kt-eyes-closed` 인지 (대시 위치)
2. Figma export 시 "Include id attribute" 체크되어 있는지
3. 브라우저 DevTools Console에서:
   ```js
   document.querySelector('[id$="kt-eyes-closed"]')
   ```
   가 요소를 반환하는지 확인. null이면 ID 누락.

## 6. 미리보기

캐릭터 추가 후 + 버튼으로 새 타이머 만들고 ⚙ 설정 → 캐릭터 선택창에서 새 캐릭터 클릭.
