/**
 * Preload — 메인 프로세스와 렌더러를 잇는 안전한 다리.
 * contextIsolation: true 환경에서 노출할 API만 정의한다.
 * renderer 코드에서 window.kirbyAPI.xxx() 로 접근.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kirbyAPI', {
  // 창 제어
  closeWindow: () => ipcRenderer.send('window:close'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  hideWindow: () => ipcRenderer.send('window:hide'),

  // 항상 위 토글 (Promise<boolean>: 토글 후 새 상태 반환)
  toggleAlwaysOnTop: () => ipcRenderer.invoke('window:toggleAlwaysOnTop'),
  isAlwaysOnTop: () => ipcRenderer.invoke('window:isAlwaysOnTop'),

  // 외부 캐릭터 폴더에서 캐릭터 목록 로드
  listCharacters: () => ipcRenderer.invoke('characters:list'),
  openCharactersFolder: () => ipcRenderer.invoke('characters:openFolder'),

  // 플랫폼 정보 (renderer에서 OS별 분기 필요할 때)
  platform: process.platform,
});
