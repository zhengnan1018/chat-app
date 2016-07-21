var socketio = require('../node_modules/socket.io')
var io
var guestNumber = 1
var nickNames = {}
var namesUsed = []
var currentRoom = {}

export.listen = function(server) {
  // 启动Socket.IO服务器，允许它搭载在已有的http服务器上
  io = socketio.listen(server)
  // 关闭debug信息
  io.set('log level', 1)
  // 定义每个用户连接的处理逻辑
  io.sockets.on('connection', function(socket) {
    // 处理新用户昵称
    guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed)
    // 进入聊天室
    joinRoom(socket, 'Lobby')
    handleMessageBroadcasting(socket, nickNames)
    handleNameChangeAttempt(socket, nickNames, namesUsed)
    handleRoomJoining(socket)

    socket.on('rooms', function() {
      socket.emit('rooms', {
        rooms: io.sockets.manager.rooms
      })
    })

    handleClientDisconnection(socket, nickNames, namesUsed)
  })
}

// 分配用户昵称
function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
  var name = 'Guest' + guestNumber
  nickNames[socket.id] = name
  socket.emit('nameResult', {
    success: true,
    name: name
  })
  namesUsed.push(name)
  return guestNumber ++
}

// 进入聊天室相关逻辑
function joinRoom(socket, room) {
  socket.join(room)
  currentRoom[socket.id] = room
  socket.emit('joinResult', {
    room: room
  })
  socket.broadcast.to(room).emit('message', {
    text: nickNames[socket.id] + 'has joined' + room + '.'
  })
  var usersInRoom = io.sockets.client(room)
  if (usersInRoom.length > 1) {
    var usersInRoomSummary = 'Users currently in ' + room + ': '
    for (var index in usersInRoom) {
      var userSocketId = usersInRoom[index].id
      if (userSocketId !== socket.id) {
        if (index > 0) {
          usersInRoomSummary += ','
        }
        usersInRoomSummary += nickNames[userSocketId]
      }
    }
    usersInRoomSummary += '.'
    socket.emit('message', {
      text: usersInRoomSummary
    })
  }
}

//发送聊天信息
function handleMessageBroadcasting(socket, nickNames) {
  socket.on('message', function(message) {
    socket.broadcast.to(message.room).emit('message', {
      text: nickNames[socket.id] + ':' + message.text
    })
  })
}

//更名请求的处理逻辑
function handleNameChangeAttempt(socket, nickNames, namesUsed) {
  // 添加 nameAttempt 事件监听器
  socket.on('nameAttempt', function(name) {
    if (name.indexOf('Guest') == 0) {
      socket.emit('nameResult', {
        success: false,
        message: 'Names cannot begin with Guest.'
      })
    } else {
      if (namesUsed.indexOf(name) === -1) {
        var previoueName = nickNames[socket.id]
        var previoueNameIndex = namesUsed.indexOf(previoueName)
        namesUsed.push(name)
        nickNames[socket.id] = name
        delete namesUsed[previoueNameIndex]
        socket.emit('nameResult', {
          success: true,
          name: name
        })
        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
          text: previoueName + 'is now known as' + name + '.'
        })
      } else {
        socket.emit('nameResult', {
          success: false,
          message: 'This name is already in use.'
        })
      }
    }
  })
}

//创建房间
function handleRoomJoining(socket) {
  socket.on('join', function(room) {
    socket.leave(currentRoom[socket.id])
    joinRoom(socket, room.newRoom)
  })
}

//处理用户离开聊天程序逻辑
function handleClientDisconnection(socket, nickNames, namesUsed) {
  socket.on('disconnect', function() {
    var nameIndex = namesUsed.indexOf(nickNames[socket.id])
    delete namesUsed[nameIndex]
    delete nickNames[socket.id]
  })
}
