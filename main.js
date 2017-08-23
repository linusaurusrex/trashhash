'use strict';
const electron = require('electron');

let dirs = process.argv.slice(2, process.argv.length);

let win = null;
electron.app.on('window-all-closed', () => {
    if (process.platform != 'darwin') electron.app.quit();
});
electron.app.on('ready', () => {
    win = new electron.BrowserWindow({width:900, height:600, backgroundColor: '#000'});
    win.loadURL(`file://${__dirname}/index.html`);
    win.on('closed', ()=>{win = null;});
    //electron.ipcMain.send('asynchronous-message', dirs);
    let winCont = win.webContents;
    winCont.on('did-finish-load', () => win.send('ping', JSON.stringify({sub:'dirlist', dirs})));
});