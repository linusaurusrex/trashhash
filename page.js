'use strict';
const hash = require('./hash');
const fs = require('fs');
const path = require('path');
const electron = require('electron');
let log = null;
//get dir list as array
electron.ipcRenderer.on('ping', (event, msg) => {
  let data = JSON.parse(msg);
  if (data.sub == 'dirlist') {
    log = hash(data.dirs, progHook);
  }
});

function progHook(data) {
  if (data.sub == 'log') progHook.log = data.log;
  if (data.sub == 'hash') {
    let n = data.log.dups[data.file.hash].length
    switch (n) {
      case 1: break;
      case 2: pageAPI.addDup(data.log.dups[data.file.hash][0]);
      default: pageAPI.addDup(data.file);
    }
  }
}
progHook;

let pageAPI = {
  elems: {
    confdel: document.querySelector('#confirmdelete'),
    delbox: document.querySelector('#deletebox .contents ul'),
    dupbox: document.querySelector('#duplicatebox .contents ul'),
  },
  dups: {},
  dels: {},
  addDup(f) {
    if (!pageAPI.dups[f.hash]) pageAPI.dups[f.hash] = {};
    pageAPI.dups[f.hash][f.name] = f;
    pageAPI.render();
  },
  moveDupToDel(f) {
    delete pageAPI.dups[f.hash][f.name];
    if (!pageAPI.dels[f.hash]) pageAPI.dels[f.hash] = {};
    pageAPI.dels[f.hash][f.name] = f;
    pageAPI.render();
  },
  moveDelToDup(f) {
    delete pageAPI.dels[f.hash][f.name];
    if (!pageAPI.dups[f.hash]) pageAPI.dups[f.hash] = {};
    pageAPI.dups[f.hash][f.name] = f;
    pageAPI.render();

  },
  render() {//put the element code in another function
    let dup = pageAPI.elems.dupbox;
    let del = pageAPI.elems.delbox;
    for (let c of [...dup.childNodes]) dup.removeChild(c);
    for (let c of [...del.childNodes]) del.removeChild(c);
    for (let k of Object.keys(pageAPI.dups))
      for (let j of Object.keys(pageAPI.dups[k]))
        pageAPI.elems.dupbox.appendChild(pageAPI.fileElem(pageAPI.dups[k][j], false));
    for (let k of Object.keys(pageAPI.dels))
      for (let j of Object.keys(pageAPI.dels[k])) {
        pageAPI.elems.delbox.appendChild(pageAPI.fileElem(pageAPI.dels[k][j], true));
      }
  },
  fileElem(f, del) {
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
    mover.classList.add('mover', 'movdel');
    mover.appendChild(moveText);
    mover.addEventListener('click', () => {
        pageAPI[del ? 'moveDelToDup' : 'moveDupToDel'](f);
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
};
pageAPI.elems.confdel.addEventListener('click', () => {
  if (confirm('You are about to delete the listed files. Do so at your own risk. If you are scared, click "cancel"'))
    for (let k of Object.keys(pageAPI.dels))
      for (let f of Object.keys(pageAPI.dels[k]))
        fs.unlink(path.resolve(f), err => err)
});
