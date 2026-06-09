// Electron main process — wraps the DEEPER web build in a standalone desktop window.
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const SMOKE = process.env.DEEPER_SMOKE === '1';
const SMOKE_FILE = path.join(os.tmpdir(), 'deeper-smoke.txt');
function smokeLog(line) {
  try {
    fs.appendFileSync(SMOKE_FILE, line + '\n');
  } catch {
    /* ignore */
  }
}

// A single instance only (re-launch focuses the existing window).
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 600,
    height: 1000,
    minWidth: 420,
    minHeight: 720,
    backgroundColor: '#05050a',
    title: 'DEEPER',
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // keep 60fps even when unfocused
    },
  });

  Menu.setApplicationMenu(null);

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    win.loadURL('http://localhost:5173');
  }

  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });

  // Surface any load failures (useful for debugging a packaged build).
  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    smokeLog('DID-FAIL-LOAD code=' + code + ' desc=' + desc + ' url=' + url);
  });

  // Headless smoke test: DEEPER_SMOKE=1 launches, checks the game booted, then quits.
  if (SMOKE) {
    win.webContents.on('console-message', (...args) => {
      const msg = args.find((a) => typeof a === 'string');
      if (msg) smokeLog('RENDERER: ' + msg);
    });
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          const r = await win.webContents.executeJavaScript(
            "JSON.stringify({canvas: !!document.querySelector('canvas'), w: (document.querySelector('canvas')||{}).width||0, scene: (window.__deeper&&window.__deeper.game)?window.__deeper.game.scene.getScenes(true).map(s=>s.scene.key):'n/a'})",
          );
          smokeLog('SMOKE-RESULT ' + r);
        } catch (e) {
          smokeLog('SMOKE-EVAL-ERR ' + String(e));
        }
        app.quit();
      }, 3500);
    });
  }

  // F11 toggles fullscreen (the game's Scale.FIT handles any window size).
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });

  // Open any external links in the user's browser, not inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
