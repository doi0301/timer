# Assets 폴더

빌드에 필요한 아이콘 파일들을 여기에 넣어주세요.

## 필요한 파일

| 파일명 | 용도 | 권장 크기 | 형식 |
|---|---|---|---|
| `icon.ico` | Windows 앱 아이콘 + NSIS installer | 256×256 (multi-size) | ICO |
| `icon.icns` | macOS 앱 아이콘 + DMG | 1024×1024 | ICNS |
| `icon.png` | Linux 앱 아이콘 | 1024×1024 | PNG |
| `tray-icon.png` | 시스템 트레이 아이콘 | 32×32 (Win/Linux), 16×16@2x (macOS template) | PNG |

## 아이콘 만들기

### 1. Figma에서 마스터 아이콘 디자인
- 1024×1024 정사각형 프레임
- 헤드폰 낀 커비 얼굴 정도가 단순하고 알아보기 쉬움
- 트레이용은 단색 실루엣이 깔끔 (특히 macOS)

### 2. 1024×1024 PNG로 export → 다음 도구로 변환

**Windows ICO**:
- https://icoconvert.com (256×256 multi-size 옵션 켜기)
- 또는 ImageMagick: `magick icon-1024.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico`

**macOS ICNS**:
- macOS의 `iconutil`:
  ```bash
  mkdir icon.iconset
  sips -z 16 16     icon-1024.png --out icon.iconset/icon_16x16.png
  sips -z 32 32     icon-1024.png --out icon.iconset/icon_16x16@2x.png
  sips -z 32 32     icon-1024.png --out icon.iconset/icon_32x32.png
  sips -z 64 64     icon-1024.png --out icon.iconset/icon_32x32@2x.png
  sips -z 128 128   icon-1024.png --out icon.iconset/icon_128x128.png
  sips -z 256 256   icon-1024.png --out icon.iconset/icon_128x128@2x.png
  sips -z 256 256   icon-1024.png --out icon.iconset/icon_256x256.png
  sips -z 512 512   icon-1024.png --out icon.iconset/icon_256x256@2x.png
  sips -z 512 512   icon-1024.png --out icon.iconset/icon_512x512.png
  cp                icon-1024.png       icon.iconset/icon_512x512@2x.png
  iconutil -c icns icon.iconset
  ```
- 또는 https://cloudconvert.com/png-to-icns

**올인원 도구**: `electron-icon-builder` npm 패키지
```bash
npm install -g electron-icon-builder
electron-icon-builder --input=icon-1024.png --output=./assets
```

### 3. 트레이 아이콘 별도 디자인
- macOS template 이미지: 검은 단색 + 알파 (다크모드 자동 대응)
- Windows: 컬러 PNG도 OK
- 16×16에서 알아볼 수 있게 디테일 최소화

## 임시 빌드 (아이콘 없이)

아이콘 없이 빌드하면 Electron 기본 아이콘이 사용되며, electron-builder가
경고를 출력합니다. 테스트 빌드는 동작하지만 배포 전엔 반드시 교체하세요.
