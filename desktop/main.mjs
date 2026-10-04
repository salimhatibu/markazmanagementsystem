import { app, BrowserWindow, shell } from "electron";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LOCAL = "http://localhost:5173/";
const HOSTED = process.env.MARKAZ_DESK_URL || "https://markaz.example.workers.dev/";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

let vite = null;
let startedVite = false;

async function isUp(url) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return response.status > 0;
  } catch {
    return false;
  }
}

async function waitFor(url) {
  for (let i = 0; i < 50; i += 1) {
    if (await isUp(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
}

function startVite() {
  vite = spawn("npm", ["run", "dev"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  startedVite = true;
}

function stopVite() {
  if (!startedVite || !vite) return;
  if (process.platform === "win32" && vite.pid) {
    spawn("taskkill", ["/pid", String(vite.pid), "/T", "/F"], { stdio: "ignore", shell: true });
  } else {
    vite.kill("SIGTERM");
  }
  startedVite = false;
  vite = null;
}

async function targetUrl() {
  if (app.isPackaged) return HOSTED;
  if (await isUp(LOCAL)) return LOCAL;
  startVite();
  if (!(await waitFor(LOCAL))) {
    throw new Error("The local Markaz site did not start on http://localhost:5173/");
  }
  return LOCAL;
}

function createWindow(url) {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: "Markaz",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.webContents.setWindowOpenHandler(({ url: next }) => {
    void shell.openExternal(next);
    return { action: "deny" };
  });
  void win.loadURL(url);
}

app.whenReady().then(async () => {
  const url = await targetUrl();
  createWindow(url);
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(url);
  });
}).catch((error) => {
  console.error(error);
  app.quit();
});

app.on("window-all-closed", () => {
  stopVite();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", stopVite);
