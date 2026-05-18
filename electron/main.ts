import { app, BrowserWindow, Menu, ipcMain, globalShortcut } from "electron";
import path from "node:path";
import logger from "electron-log";

logger.initialize();
logger.transports.file.resolvePathFn = () => path.join(process.cwd(), "cm.log");

ipcMain.handle("log-to-file", (_, level: string, message: string) => {
  const logLevels: Record<string, (msg: string) => void> = {
    error: logger.error,
    warn: logger.warn,
    info: logger.info,
    debug: logger.debug,
  };
  const logMethod = logLevels[level] || logger.info;
  logMethod(message);
});

function openSettings() {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    window.webContents.send("open-settings");
  } else {
    logger.error("No focused window, cannot open settings");
  }
}

const DIST = path.join(__dirname, "../renderer");
const VITE_PUBLIC = app.isPackaged ? DIST : path.join(DIST, "../public");

process.env.DIST = DIST;
process.env.VITE_PUBLIC = VITE_PUBLIC;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(DIST, "index.html"));
  }

  // Log preload injection
  win.webContents.on("preload-error", (_, preloadPath, error) => {
    logger.error(`Preload error for ${preloadPath}: ${error.message}`);
  });
}

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "File",
      submenu: [
        {
          label: "设置",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            if (win) {
              win.webContents.send("open-settings");
            } else {
              logger.error("Window is null, cannot send open-settings");
            }
          },
        },
        { type: "separator" },
        { role: "quit", label: "退出" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();
  createMenu();

  // Register global shortcut Ctrl+,
  const shortcutRegistered = globalShortcut.register("Ctrl+,", openSettings);
  if (!shortcutRegistered) {
    logger.error("Failed to register global shortcut Ctrl+,");
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("will-quit", () => {
  // Unregister all global shortcuts
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
