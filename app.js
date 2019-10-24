const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const fs = require('fs')
const path = require('path')
const exec = require('child_process').exec
let child
const imagemin = require('imagemin')
const imageminMozjpeg = require('imagemin-mozjpeg')
const imageminPngquant = require('imagemin-pngquant')
const util = require('./util')

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

const port = process.argv[2]
const timeGetScreen = process.argv[3]

function getScreen () {
  if (process.platform !== 'linux') {
    const cmd = __dirname + '/cmdcapture.fbi /f screen.png'
    child = exec(cmd, function (error, stdout, stderr) {
      imagemin(['./screen.png'], './www/images', {
        plugins: [
          imageminMozjpeg({ targa: true }),
          imageminPngquant({ quality: '65-80' })
        ]
      }).then(files => {
        io.sockets.emit('showscreen')
        setTimeout(getScreen, timeGetScreen)
      })
    })
  }
}

getScreen()

// Socket
io.on('connection', function (socket) {})

if (!fs.existsSync(path.join(__dirname, 'www', 'downloads'))) {
  fs.mkdirSync(path.join(__dirname, 'www', 'downloads'))
}

fs.watch(path.join(__dirname, 'www', 'downloads'), function (event, filename) {
  io.sockets.emit('filechangedownload', { })
})

process.setMaxListeners(0)
const FRONTEND_PATH = __dirname + '/www'
app.use(express.static(FRONTEND_PATH))

app.get('/', function (req, res) {
  res.sendfile(FRONTEND_PATH + '/index.html')
})
app.post('/getfilesdownload', function (req, res) {
  res.jsonp(util.dirTree(path.join(__dirname, 'www', 'downloads'), true))
})
app.post('/getfile', function (req, res) {
  if (req.body.file) {
    res.sendfile(req.body.file)
  } else {
    res.send('')
  }
})
app.get('/getfile', function (req, res) {
  if (req.query.file) {
    res.sendfile(req.query.file)
  } else if (req.query.screen) {
    res.sendfile(FRONTEND_PATH + '/images/screen.png')
  } else {
    res.send('')
  }
})

server.listen(port)
console.log('ShowMyScreen running: ' + port)
