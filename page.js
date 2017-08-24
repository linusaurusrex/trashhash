'use strict';
const fs = require('fs');
const path = require('path');
const electron = require('electron');
const hash = require('./hash');

let log = null;

let dups = {};
let dels = {};
// Add a new file to Duplicates column
function addDup(f) {
  if (!dups[f.hash]) dups[f.hash] = {};
  dups[f.hash][f.name] = f;
  render();
}
// Move a file between columns
function moveFile(f, a, b) {
  delete a[f.hash][f.name];
  if (!b[f.hash]) b[f.hash] = {};
  b[f.hash][f.name] = f;
  if (Object.keys(a[f.hash] || {}).length == 0) delete a[f.hash];
  render();
}

// Create DOM nodes for file
function fileElem(f, del) {
  let openText = document.createTextNode('Open');
  let opener = document.createElement('button');
  opener.classList.add('opener');
  opener.appendChild(openText);
  opener.addEventListener('click', () => {
      electron.shell.openItem(path.resolve(f.name));
  });
  let showText = document.createTextNode('Show in file explorer');
  let shower = document.createElement('button');
  shower.classList.add('shower');
  shower.appendChild(showText);
  shower.addEventListener('click', () => {
      electron.shell.showItemInFolder(path.resolve(f.name));
  });
  let moveText = document.createTextNode(`${del ? 'Remove from' : 'Add to'} delete queue`);
  let mover = document.createElement('button');
  mover.classList.add('mover', del ? 'movedup' : 'movedel');
  mover.appendChild(moveText);
  mover.addEventListener('click', () => {
    moveFile(f, ...(del ? [dels, dups] : [dups, dels]));
  });
  let file = document.createElement('li');
  file.classList.add('file');
  file.style['background-color'] = `#${f.hash.substr(0,6)}`;
  let name = document.createTextNode(f.name);
  file.appendChild(name);
  file.appendChild(document.createElement('br'));
  file.appendChild(opener);
  file.appendChild(shower);
  file.appendChild(mover);
  return file;
}
function render() {
  let dup = elems.dupbox;
  let del = elems.delbox;
  for (let c of [...dup.childNodes]) dup.removeChild(c);
  for (let c of [...del.childNodes]) del.removeChild(c);
  for (let k of Object.keys(dups))
    for (let j of Object.keys(dups[k]))
      elems.dupbox.appendChild(fileElem(dups[k][j], false));
  for (let k of Object.keys(dels))
    for (let j of Object.keys(dels[k])) {
      elems.delbox.appendChild(fileElem(dels[k][j], true));
    }
}
// Important DOM nodes
let elems = {
  confdel: document.querySelector('#confirmdelete'),
  addall: document.querySelector('#addall'),
  remall: document.querySelector('#remall'),
  delbox: document.querySelector('#deletebox .contents ul'),
  dupbox: document.querySelector('#duplicatebox .contents ul')
};
elems.confdel.addEventListener('click', () => {
  if (confirm('You are about to delete the listed files. Do so at your own risk. If you are scared, click "cancel"'))
    for (let k of Object.keys(dels))
      for (let f of Object.keys(dels[k])) {
        fs.unlink(path.resolve(f), err => err); // does not handle errors
        let file = dels[k][f];
        delete dels[k][f];
        if (Object.keys(dups[k] || {}).length <= 1) delete dups[k];
        render();
      }
});
elems.addall.addEventListener('click', () => {
  for (let b of [...document.querySelectorAll('.movedel')]) b.click();
});
elems.remall.addEventListener('click', () => {
  for (let b of [...document.querySelectorAll('.movedup')]) b.click();
});

// Receive hashes
function progHook(data) {
  if (data.sub == 'log') progHook.log = data.log;
  if (data.sub == 'hash') {
    let n = data.log.dups[data.file.hash].length
    switch (n) {
      case 1: break;
      case 2: addDup(data.log.dups[data.file.hash][0]);
      default: addDup(data.file);
    }
  }
}

// Receive files from command line
electron.ipcRenderer.on('ping', (event, msg) => {
  let data = JSON.parse(msg);
  if (data.sub == 'dirlist') {
    log = hash(data.dirs, progHook);
  }
});


