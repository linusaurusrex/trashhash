'use strict';
const electron = require('electron');



let win = null;
electron.app.on('window-all-closed', () => {
  if (process.platform != 'darwin') electron.app.quit();
});
// Open app and send arguments
electron.app.on('ready', () => {
  win = new electron.BrowserWindow({});
  win.loadURL(`file://${__dirname}/index.html`);
  win.on('closed', () => {
    win = null;
  });
  let winCont = win.webContents;
});