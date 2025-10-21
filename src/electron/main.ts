import { app, BrowserWindow } from "electron";
import * as path from "path";
import { fileURLToPath } from "url";

const isDev = !app.isPackaged;

// 获取 __dirname 的 ES 模块兼容方式
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 全局窗口引用
let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // 用 preload 通信
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      // 启用 ES 模块支持
      sandbox: false,
    },
  });

  // 设置安全的 Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;",
          ],
        },
      });
    }
  );

  mainWindow.removeMenu(); // 隐藏顶部菜单栏

  const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

  if (isDev) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL!);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
