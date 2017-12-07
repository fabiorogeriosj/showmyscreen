const {dialog} = require('electron').remote
const { spawn } = require('child_process')
const os = require('os')
const fs = require('fs')
const path = require('path')
const util = require('./util')

function showForm() {
    document.getElementById('buttons-init').style.display='none'
    document.getElementById('form-settings').style.display='block'
    var port = localStorage.getItem('port')
    var fps = localStorage.getItem('fps')
    if(fps) {
        fps = 1000 / Number(fps)
        document.getElementById('fps').value = fps
    }
    if(port) {
        document.getElementById('port').value = port
    }
}

function hideForm() {
    document.getElementById('form-settings').style.display='none'
    document.getElementById('buttons-init').style.display='block'
}

function save() {
    var port = document.getElementById('port').value
    var fps = document.getElementById('fps').value
    if(fps) fps = 1000 / Number(fps)
    localStorage.setItem('port', port)
    localStorage.setItem('fps', fps)
    hideForm()
}

function start() {
    var port = 80
    if(localStorage.getItem('port')) port = localStorage.getItem('port')
    util.isPortTaken(port, (err, res) => {
        console.log(err, res)
        if(err) {
            return dialog.showMessageBox({
                type: 'error',
                title: 'Error',
                message: `Could not start application on port: ${port}`,
                detail: JSON.stringify(err)
            })
        }

        runApp(port)
    })
}

function stop() {
    document.body.classList = ''
    runShowMyScreen.kill()
}

var runShowMyScreen = null

function runApp(port) {
    var fps = 50
    if(localStorage.getItem('fps')) fps = localStorage.getItem('fps')
    runShowMyScreen = spawn('node', ['app.js',port, fps], {
        cwd: process.cwd()
    })
    runShowMyScreen.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`)
        if(data.indexOf('running') >= 0) {
            document.body.classList = 'started'
            
            getIPS((ips) => {
                console.log(ips)
                document.getElementById('show-ips').innerHTML = 'OPEN THE BROWSER WITH ONE OF THE IPs BELOW:\n\n'
                for(o of ips) {
                    document.getElementById('show-ips').innerHTML += `\nHOST: http://${o.ip}${port!=80?':'+port:''}`
                    document.getElementById('show-ips').innerHTML += `\n(${o.name})\n`
                }
            })

            getFilesDownloads()

            dropZone()
        }
    })

    runShowMyScreen.stderr.on('data', (data) => {
        dialog.showMessageBox({
            type: 'error',
            title: 'Error',
            message: `Could not start application on port: ${port}`,
            detail: JSON.stringify(data)
        })
    })

    runShowMyScreen.on('close', (code) => {
        console.log(`child process exited with code ${code}`)
    })   
}

function getFilesDownloads() {
    var files = util.dirTree(path.join(process.cwd(), 'www', 'downloads'), true)
    var list = document.getElementById('list')
    list.innerHTML = ''
    for(o of files.children) {
        if(o.type === 'file') {
            list.innerHTML += `
            <div class="item">
                <img onclick="removeFile('${o.path}')" src="img/waste-bin.png" title="Remove">
                ${o.name}
            </div>
            `
        }
    }
}

function removeFile (file) {
    var fileName = file.split('downloads')[1]
    fileName = fileName.replace('\\', '')
    fileName = fileName.replace('/', '')
    var p = path.join(process.cwd(), 'www', 'downloads', fileName)
    fs.unlinkSync(p)
    getFilesDownloads()
}

function getIPS (callback) {
    var ifaces = os.networkInterfaces()
    var ips = []
    Object.keys(ifaces).forEach(function (ifname) {
      var alias = 0
    
      ifaces[ifname].forEach(function (iface) {
        if ('IPv4' !== iface.family || iface.internal !== false) {
          return
        }
    
        if (alias >= 1) {
            ips.push({
                name: ifname,
                ip: iface.address
            })
        } else {
            ips.push({
                name: ifname,
                ip: iface.address
            })
        }
      })
    })
    callback(ips)
}

function shareFile() {
    dialog.showOpenDialog({
        title: 'Share file',
        filters: [{name: 'All Files', extensions: ['*']}]
    }, (data) => {
        for(d of data){
            var name = path.basename(d)
            var fileTo = path.join(process.cwd(), 'www', 'downloads', name)
            fs.createReadStream(d).pipe(fs.createWriteStream(fileTo))
        }
        getFilesDownloads()
    })
}

function dropZone() {
    var holder = document.getElementById('dropZone');
    
    holder.ondragover = () => false

    holder.ondragleave = () => false

    holder.ondragend = () => false

    holder.ondrop = (e) => {
        e.preventDefault()

        for (let f of e.dataTransfer.files) {
            var name = path.basename(f.path)
            var fileTo = path.join(process.cwd(), 'www', 'downloads', name)
            fs.createReadStream(f.path).pipe(fs.createWriteStream(fileTo))
        }
        getFilesDownloads()
        return false
    }
}