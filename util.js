const net = require('net')
const fs = require('fs')
const path = require('path')

function isPortTaken(port, callback) {
    var tester = net.createServer().once('error', (err) => {
    if (err.code != 'EADDRINUSE') return callback(err)
        callback()
    }).once('listening', () => tester.once('close', () => callback()).close()).listen(port)
}

function dirTree(filename, notObserver) {
    var stats = fs.lstatSync(filename),
        info = {
            path: filename,
            name: path.basename(filename)
        };

    if (stats.isDirectory()) {
        info.type = "folder";
        info.children = fs.readdirSync(filename).map(function(child) {
            return dirTree(filename + '/' + child);
        });
    } else {
        info.type = "file";
        if(!notObserver){
          fs.watchFile(filename, function (curr, prev) {
              //io.sockets.emit('filechange', { filename: filename });
          });
        }
    }

    return info;
}

module.exports = {
    isPortTaken,
    dirTree
}