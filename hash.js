'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let openFiles = 0;

module.exports = function hash(files, progHook) {
  let log = new Log(progHook);
  enumerate(files, log);
  return log; // this returns log, but may return after the first calls to progHook, so the Log constructor sends progHook the log
};
//keep track of file info
function Log(pH) {
  this.progHook = pH;
  pH({sub: 'log', log: this});
  this.q = {};
  this.dups = {};
}
//hash files that have the same size
Log.prototype.nq = function enqueue(f) {
  if (!this.q[f.size]) this.q[f.size] = [];
  let list = this.q[f.size];
  list.push(f);
  let n = list.length;
  switch (n) {
    case 1: break;
    case 2: this.nqHash(list[0]);
    default: this.nqHash(list[n-1]);
  }
};
//hash files
Log.prototype.nqHash = function enqueueHash(f) {
  if (openFiles < 256) {
    openFiles++;
    let hash = crypto.createHash('sha1');
    let stream = fs.createReadStream(f.name);
    stream.on('error', err => {});
    stream.on('data', data => hash.update(data));
    stream.on('end', () => {
      let h = hash.digest('hex');
      f.hash = h;
      if (!this.dups[h]) this.dups[h] = [];
      let list = this.dups[h];
      list.push(f);
      this.progHook({
        sub: 'hash',
        log: this,
        file: f
      });
      openFiles--;
    });
  } else setTimeout(() => log.nqHash(f), 2000);
};

function File(name, size) {
  this.name = name;
  this.size = size;
}
//recursively enumerate directory contents
function enumerate(files, log) {
  for (let f of files) {
    //openfiles check
    if (openFiles < 256) {
      openFiles++;
      fs.stat(f, (err, stats) => {
        openFiles--;
        if (err) {
          if (err.code == 'EPERM') {
            log.progHook('no permissions for ' + f);
          } else throw err;
        } else {
          let isF = stats.isFile();
          if (isF) log.nq(new File(f, stats.size));
          else fs.readdir(f, (err, files) => enumerate(files.map(n => path.join(f, n)), log));
        }
      });
    } else setTimeout(() => enumerate([f], log), 2000);
  }
}
