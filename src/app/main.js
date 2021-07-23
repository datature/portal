/* eslint-disable no-console */
// eslint-disable-next-line import/no-extraneous-dependencies
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
// const fetch = require("node-fetch");
const { PythonShell } = require("python-shell");
const fetch = require("node-fetch");
// Setup file logging
const log = require("electron-log");

log.transports.file.level = "info";
log.transports.file.file = `${__dirname}log.log`;
console.log = log.log;

const exeFileName = "run.exe";
let venv = path.join(".venv", "bin", "python");
if (process.platform.toLowerCase().includes("win32")) {
  venv = path.join(".venv", "Scripts", "python.exe");
}

let root = __dirname;
let pythonPath;
let scriptPath;
if (root.endsWith("app")) {
  root = root.slice(0, -4);
  pythonPath = path.join(root, "engine", venv);
  scriptPath = path.join(root, "engine");
} else if (root.endsWith("portal_build")) {
  pythonPath = path.join(root, venv);
  scriptPath = root;
}

const options = {
  mode: "text",
  pythonPath,
  pythonOptions: ["-u"], // get print results in real-time
  scriptPath,
};

let mainWindow;
async function startBackend() {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "portalbuild"
  ) {
    console.log(
      `NODE_ENV in ${process.env.NODE_ENV} --- running backend on pyshell`
    );

    /* Begin Python Backend Engine */
    PythonShell.run("run.py", options, (err, results) => {
      console.log("Running python shell...");
      if (err) console.log("err: ", err);
      console.log("results: ", results);
    });
  } else {
    console.log(
      `NODE_ENV in default --- running the backend executable ${exeFileName}`
    );
    const rootPath = `${app.getAppPath().slice(0, -4)}`;
    console.log(`Application Running in ${rootPath}`);
    let backend = path.join(root, "dist", exeFileName);
    if (root.endsWith("src")) {
      backend = path.join(root.slice(0, -4), "dist", exeFileName);
    }
    // eslint-disable-next-line global-require
    const execfile = require("child_process").execFile;
    execfile(
      backend,
      ["--root", rootPath],
      {
        windowsHide: true,
      },
      (err, stdout, stderr) => {
        if (err) {
          console.log(err);
        }
        if (stdout) {
          console.log(stdout);
        }
        if (stderr) {
          console.log(stderr);
        }
      }
    );
  }
}

async function checkWindowRenderReady() {
  const response = await fetch(
    "http://localhost:9449/heartbeat?isElectron=true",
    {
      method: "GET",
    }
  ).catch(() => {
    /* Ignore */
  });
  if (response === undefined || response == null) return false;
  return true;
}

async function shutDownServer() {
  await fetch("http://localhost:9449/shutdown?deleteCache=true", {
    method: "GET",
  }).catch(err => {
    console.log(err);
  });
}

async function createWindow() {
  /* Begin Python Backend Engine */
  startBackend();

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile("./out/loading.html");

  let listenForHeartbeat = true;
  setTimeout(() => {
    listenForHeartbeat = false;
  }, 150000);

  while (listenForHeartbeat) {
    // eslint-disable-next-line no-await-in-loop
    const ready = await checkWindowRenderReady();
    listenForHeartbeat = !ready;
    // eslint-disable-next-line no-await-in-loop
    await new Promise(res => setTimeout(res, 3000));
  }

  if (process.env.NODE_ENV === "development") {
    const url = `http://localhost:${3000}`;
    console.log(
      `NODE_ENV in ${process.env.NODE_ENV} --- running windows on ${url}`
    );
    mainWindow.webContents.openDevTools();
    await mainWindow.loadURL(url);
  } else {
    let staticFile = `./out/index.html`;
    if (root.endsWith("src")) {
      staticFile = path.join(root, "app", "out", "index.html");
    }
    console.log(
      `NODE_ENV in default --- running windows on static ${staticFile}`
    );
    // and load the static html build of the app.
    await mainWindow.loadFile(staticFile);
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", async function quit() {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q

  await dialog
    .showMessageBox({
      type: "none",
      buttons: ["No", "Yes"],
      title: "Save Progress",
      detail: "Do you wish to save your progress before quitting?",
    })
    .then(async returnValue => {
      if (returnValue.response === 0) await shutDownServer();
    });

  if (process.env.NODE_ENV !== "development") {
    // eslint-disable-next-line global-require
    const { exec } = require("child_process");
    exec(`taskkill /f /t /im ${exeFileName}`, (err, stdout, stderr) => {
      if (err) {
        console.log(err);
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
    });
  }
  app.quit();
});

app.on("activate", function activate() {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// ------------------- set up event listeners here --------------------

ipcMain.on("select-dirs", async event => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  event.sender.send("select-dirs-reply", result.filePaths);
});

ipcMain.on("restart-server", async event => {
  await startBackend();
  event.sender.send("restart-server-reply");
});
