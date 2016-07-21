var http = require('http')
var fs = require('fs')
var path = require('path')
var mime = require('mime')
var cache = {}


// 发送文件数据及错误相应
// 请求文件不存在
function send404(response) {
  response.writeHead(404, {'Content-Type': 'text/plain'})
  response.write('Error 404: resource not found')
  response.end()
}

// 提供文件数据服务
function sendFile(response, filePath, fileContents) {
  response.writeHead(200, {'Content-Type': mime.lookup(path.basename(filePath))})
  response.end(fileContents)
}

// 提供静态文件服务
function serverStatic(response, cache, absPath) {
  if (cache[absPath]) {
    sendFile(response, absPath, cache[absPath])
  } else {
    fs.exists(absPath, function(exists) {
      if (exists) {
        fs.readFile(absPath, function(err, data) {
          if (err) {
            send404(response)
          } else {
            cache[absPath] = data // 将文件数据缓存在 cache 中
            sendFile(response, absPath, data)
          }
        })
      } else {
        send404(response)
      }
    })
  }
}

// 创建 http 服务器
var server = http.createServer(function(req, res) {
  var filePath = false
  if (req.url === '/') {
    filePath = 'public/index.html'
  } else {
    filePath = 'public' + req.url
  }
  var absPath = './' + filePath
  serverStatic(res, cache, absPath)
})

server.listen(8090, function() {
  console.log('Server listening on port: 8090');
})

var chatServer = require('./lib/chat_server')
// 启动一个Socket.IO服务器，给它提供一个已经定义好的http服务器，这样它就可以和http服务器共享一个TCP/IP端口
chatServer.listen(server)
