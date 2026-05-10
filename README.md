# 커비 타이머 (Kirby Timer)

데스크탑 위에 둥둥 떠다니는 커비 모양의 귀여운 타이머.
Free Timer 대체용. 여러 타이머를 동시에 가로로 정렬해서 표시.

## 빠른 시작

```bash
npm install
npm start
```

## 빌드 (설치 파일 만들기)

```bash
npm run build:win     # Windows .exe (NSIS installer)
npm run build:mac     # macOS .dmg
npm run build:linux   # Linux AppImage / deb
```

빌드 결과물은 `dist/` 폴더에 생성됨.

## 사용법

- **클릭** = 타이머 시작/일시정지
- **시간 클릭** = 시간 설정 모달 열기
- **호버** = 컨트롤 버튼(리셋/설정/삭제) 노출
- **Space** = 타이머 토글
- **+ 버튼** = 새 타이머 추가
- **창 빈 영역 드래그** = 창 이동 (Electron `-webkit-app-region: drag`)

## 자세한 가이드

`HANDOFF.md` 참조.
