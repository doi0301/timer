/**
 * 커비 타이머 - Electron 메인 프로세스
 *
 * 책임:
 *   1) 투명 + 프레임 없는 + 항상 위 창 생성
 *   2) 창 위치/크기 기억 (재실행 시 복원)
 *   3) 시스템 트레이 + 글로벌 단축키
 *   4) 외부 캐릭터 폴더(characters/) 접근을 위한 IPC
 *   5) IPC: 창 컨트롤 (닫기, 숨기기, 항상 위 토글)
 */

const { app, BrowserWindow, screen, ipcMain, Menu, Tray, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

// 단일 인스턴스 락 — 두 번째 실행 방지
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

// ======================== 창 상태 영속화 ========================
const STATE_PATH = path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

function saveWindowState(win) {
  if (!win || win.isDestroyed()) return;
  try {
    const bounds = win.getBounds();
    const state = {
      ...bounds,
      alwaysOnTop: win.isAlwaysOnTop(),
    };
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  } catch (e) {
    console.warn('Failed to save window state:', e.message);
  }
}

// 저장된 좌표가 현재 모니터 영역 안에 있는지 검증 (모니터 분리/재배치 대응)
function isBoundsVisible(bounds) {
  if (!bounds) return false;
  return screen.getAllDisplays().some(display => {
    const a = display.workArea;
    return (
      bounds.x < a.x + a.width &&
      bounds.x + bounds.width > a.x &&
      bounds.y < a.y + a.height &&
      bounds.y + bounds.height > a.y
    );
  });
}

// ======================== 창 생성 ========================
let mainWindow = null;
let tray = null;

function getIconPath() {
  if (process.platform === 'win32') return path.join(__dirname, 'assets', 'icon.ico');
  if (process.platform === 'darwin') return path.join(__dirname, 'assets', 'icon.icns');
  return path.join(__dirname, 'assets', 'icon.png');
}

function createWindow() {
  const saved = loadWindowState();
  const defaultBounds = (() => {
    const { width: sw } = screen.getPrimaryDisplay().workAreaSize;
    return {
      width: 700,
      height: 350,
      x: Math.round((sw - 700) / 2),
      y: 80,
    };
  })();

  const bounds = (saved && isBoundsVisible(saved)) ? saved : defaultBounds;

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 220,
    minHeight: 280,
    transparent: true,
    frame: false,
    resizable: true,
    alwaysOnTop: saved?.alwaysOnTop ?? true,
    hasShadow: false,
    skipTaskbar: false,
    icon: getIconPath(),
    show: false,                     // ready-to-show 후 표시
    backgroundColor: '#00000000',    // 완전 투명
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // 모든 워크스페이스에서 보이게 (macOS Spaces, Windows 가상 데스크탑)
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // alwaysOnTop을 강한 레벨로 (다른 alwaysOnTop 창보다도 위)
  if (mainWindow.isAlwaysOnTop()) {
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  }

  mainWindow.loadFile('renderer/index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 디바운스로 위치/크기 저장
  let saveTimer = null;
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveWindowState(mainWindow), 400);
  };
  mainWindow.on('resize', scheduleSave);
  mainWindow.on('move', scheduleSave);
  mainWindow.on('close', () => saveWindowState(mainWindow));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // DevTools — 환경변수로 켜기 (KIRBY_DEV=1 npm start)
  if (process.env.KIRBY_DEV === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// ======================== 시스템 트레이 ========================
function createTray() {
  try {
    const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
    let icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      // 아이콘이 없으면 16x16 빈 placeholder (트레이는 비어도 동작은 함)
      icon = nativeImage.createEmpty();
    }
    // macOS는 템플릿 이미지 권장 (다크모드 자동 대응)
    if (process.platform === 'darwin') {
      icon.setTemplateImage(true);
    }

    tray = new Tray(icon);
    tray.setToolTip('커비 타이머');

    const menu = Menu.buildFromTemplate([
      {
        label: '보이기 / 숨기기',
        click: () => {
          if (!mainWindow) return;
          if (mainWindow.isVisible()) mainWindow.hide();
          else mainWindow.show();
        },
      },
      {
        label: '항상 위',
        type: 'checkbox',
        checked: mainWindow?.isAlwaysOnTop() ?? true,
        click: (menuItem) => {
          if (!mainWindow) return;
          mainWindow.setAlwaysOnTop(menuItem.checked, 'screen-saver');
          saveWindowState(mainWindow);
        },
      },
      { type: 'separator' },
      { label: '종료', click: () => app.quit() },
    ]);
    tray.setContextMenu(menu);

    // 좌클릭(Windows/Linux) 또는 클릭(macOS) — 보이기/숨기기 토글
    tray.on('click', () => {
      if (!mainWindow) return;
      if (mainWindow.isVisible()) mainWindow.hide();
      else mainWindow.show();
    });
  } catch (e) {
    console.warn('Tray init failed (optional):', e.message);
  }
}

// ======================== 글로벌 단축키 ========================
function registerGlobalShortcuts() {
  // Ctrl/Cmd + Shift + K — 창 보이기/숨기기 토글
  const ok = globalShortcut.register('CommandOrControl+Shift+K', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) mainWindow.hide();
    else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  if (!ok) console.warn('Global shortcut registration failed');
}

// ======================== IPC 채널 ========================
ipcMain.on('window:close', () => mainWindow?.close());
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:hide', () => mainWindow?.hide());

ipcMain.handle('window:toggleAlwaysOnTop', () => {
  if (!mainWindow) return false;
  const next = !mainWindow.isAlwaysOnTop();
  mainWindow.setAlwaysOnTop(next, 'screen-saver');
  saveWindowState(mainWindow);
  return next;
});

ipcMain.handle('window:isAlwaysOnTop', () => mainWindow?.isAlwaysOnTop() ?? false);

// 외부 캐릭터 폴더 접근 — renderer가 fetch 대신 IPC로 요청
// 폴더 구조: <앱폴더>/characters/<id>/character.svg, meta.json
ipcMain.handle('characters:list', async () => {
  const charDir = getCharactersDir();
  if (!charDir || !fs.existsSync(charDir)) return { manifest: null, characters: [] };
  try {
    const manifestPath = path.join(charDir, 'manifest.json');
    let manifest = null;
    if (fs.existsSync(manifestPath)) {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    }
    const ids = manifest?.characters ?? [];
    const characters = [];
    for (const id of ids) {
      try {
        const svgPath = path.join(charDir, id, 'character.svg');
        const metaPath = path.join(charDir, id, 'meta.json');
        if (!fs.existsSync(svgPath)) continue;
        const svg = fs.readFileSync(svgPath, 'utf-8');
        const meta = fs.existsSync(metaPath)
          ? JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
          : { name: id };
        characters.push({ id, ...meta, svg });
      } catch (e) {
        console.warn(`Failed to load character "${id}":`, e.message);
      }
    }
    return { manifest, characters };
  } catch (e) {
    console.warn('characters:list failed:', e.message);
    return { manifest: null, characters: [] };
  }
});

// 패키징 후엔 resourcesPath, 개발 시엔 __dirname 기준
function getCharactersDir() {
  const candidates = [
    path.join(__dirname, 'characters'),
    path.join(process.resourcesPath || '', 'characters'),
    path.join(app.getPath('userData'), 'characters'),  // 사용자 추가 캐릭터
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return path.join(__dirname, 'characters');  // 없어도 기본 경로 반환
}

ipcMain.handle('characters:openFolder', () => {
  const dir = getCharactersDir();
  fs.mkdirSync(dir, { recursive: true });
  require('electron').shell.openPath(dir);
  return dir;
});

// ======================== 앱 라이프사이클 ========================
app.whenReady().then(() => {
  createWindow();
  createTray();
  registerGlobalShortcuts();

  app.on('activate', () => {
    // macOS: dock 아이콘 클릭 시 창 없으면 재생성
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (!mainWindow.isVisible()) mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // macOS는 dock에 남기는 게 컨벤션이지만, 트레이 앱이므로 종료
  if (process.platform !== 'darwin') app.quit();
});
