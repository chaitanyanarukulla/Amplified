const { app, BrowserWindow, ipcMain, screen, globalShortcut } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let pythonProcess;

function createWindow() {
    // Get primary display dimensions
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 400,
        height: 600,
        x: width - 420, // Position top-right
        y: 50,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // For MVP simplicity, use preload in production
            webSecurity: false // Allow local resources if needed
        },
        frame: false, // Frameless for custom UI
        transparent: true, // Allow transparency
        alwaysOnTop: true, // Float over other windows
        hasShadow: true,
        resizable: true,
    });

    // Load the index.html of the app.
    // In development, load from Vite dev server
    const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
    console.log('Loading Electron window from:', startUrl);
    mainWindow.loadURL(startUrl);
    console.log('Electron window created successfully');

    // Open the DevTools.
    mainWindow.webContents.openDevTools({ mode: 'detach' });

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    // Register global shortcut for "Stall" or "Suggest"
    globalShortcut.register('CommandOrControl+Space', () => {
        mainWindow.webContents.send('trigger-suggestion');
    });
}

function startPythonBackend() {
    const backendPath = path.join(__dirname, '../../backend/main.py');
    // Assuming python is in the path or venv
    // In production, this needs to point to the bundled executable

    // For dev, we assume the venv is active or python3 is available
    // We'll try to use the venv python if it exists
    const venvPython = path.join(__dirname, '../../backend/venv/bin/python3');

    console.log('Starting Python backend...');

    pythonProcess = spawn(venvPython, [backendPath], {
        cwd: path.join(__dirname, '../../backend'),
    });

    pythonProcess.stdout.on('data', (data) => {
        console.log(`Backend: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.log(`Backend (log): ${data}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`Backend process exited with code ${code}`);
    });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
    startPythonBackend();
    createWindow();

    app.on('activate', function () {
        if (mainWindow === null) createWindow();
    });
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
    // Unregister all shortcuts
    globalShortcut.unregisterAll();

    // Kill python process
    if (pythonProcess) {
        pythonProcess.kill();
    }
});

// IPC handlers
ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win.setIgnoreMouseEvents(ignore, options);
});

ipcMain.on('resize-window', (event, width, height) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win.setSize(width, height);
});

ipcMain.on('close-app', () => {
    app.quit();
});

ipcMain.on('minimize-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win.minimize();
});

ipcMain.on('refresh-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win.reload();
});
