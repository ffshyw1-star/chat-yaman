const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// متغيرات عامة
const users = new Map();
const rooms = new Map();
const messages = [];

// البيانات الأولية
const defaultRooms = ['عام', 'اليمن', 'الجزائر', 'مصر'];
defaultRooms.forEach(room => {
  rooms.set(room, { name: room, users: [], messages: [] });
});

// نموذج المستخدم
class User {
  constructor(id, name, role, gender, socketId) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.gender = gender;
    this.socketId = socketId;
    this.joinTime = new Date();
    this.currentRoom = null;
    this.credit = 0;
  }
}

// نموذج الرسالة
class Message {
  constructor(user, text, room) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.user = user;
    this.text = text;
    this.room = room;
    this.timestamp = new Date();
  }
}

// Socket.io Events
io.on('connection', (socket) => {
  console.log('✅ مستخدم جديد متصل:', socket.id);

  // تسجيل الدخول
  socket.on('user_login', (data) => {
    const user = new User(
      Math.random().toString(36).substr(2, 9),
      data.name,
      data.role,
      data.gender,
      socket.id
    );
    
    users.set(socket.id, user);
    
    // إرسال قائمة الغرف
    socket.emit('rooms_list', Array.from(rooms.keys()));
    
    // بث تحديث المستخدمين
    io.emit('users_update', Array.from(users.values()));
    
    console.log(`👤 ${user.name} دخل كـ ${user.role}`);
  });

  // الدخول للغرفة
  socket.on('join_room', (roomName) => {
    const user = users.get(socket.id);
    if (!user) return;
    
    // مغادرة الغرفة السابقة
    if (user.currentRoom) {
      socket.leave(user.currentRoom);
      const prevRoom = rooms.get(user.currentRoom);
      if (prevRoom) {
        prevRoom.users = prevRoom.users.filter(u => u.id !== user.id);
      }
    }
    
    // الانضمام للغرفة الجديدة
    user.currentRoom = roomName;
    socket.join(roomName);
    
    const room = rooms.get(roomName);
    if (room) {
      room.users.push(user);
    }
    
    // إرسال الرسائل السابقة
    if (room && room.messages) {
      socket.emit('messages_history', room.messages);
    }
    
    // رسالة ترحيب
    const systemMsg = {
      type: 'system',
      text: `[ ${user.name} انضم للغرفة ${roomName} - أهلاً وسهلاً ]`,
      timestamp: new Date()
    };
    
    io.to(roomName).emit('new_message', systemMsg);
    io.to(roomName).emit('room_users', room.users);
    
    console.log(`🚪 ${user.name} دخل غرفة: ${roomName}`);
  });

  // إرسال رسالة
  socket.on('send_message', (data) => {
    const user = users.get(socket.id);
    if (!user || !user.currentRoom) return;
    
    const message = new Message(user, data.text, user.currentRoom);
    
    const room = rooms.get(user.currentRoom);
    if (room) {
      room.messages.push(message);
    }
    
    messages.push(message);
    
    io.to(user.currentRoom).emit('new_message', {
      id: message.id,
      user: {
        id: user.id,
        name: user.name,
        gender: user.gender,
        role: user.role
      },
      text: message.text,
      timestamp: message.timestamp
    });
    
    console.log(`💬 رسالة من ${user.name} في ${user.currentRoom}`);
  });

  // الرسائل الخاصة
  socket.on('private_message', (data) => {
    const sender = users.get(socket.id);
    if (!sender) return;
    
    const recipient = Array.from(users.values()).find(u => u.name === data.recipientName);
    if (!recipient) {
      socket.emit('error', 'المستخدم غير متصل');
      return;
    }
    
    io.to(recipient.socketId).emit('private_message', {
      from: sender.name,
      fromId: sender.id,
      text: data.text,
      timestamp: new Date()
    });
    
    socket.emit('private_message_sent', { to: recipient.name });
  });

  // قائمة المتواجدين
  socket.on('get_users', () => {
    const user = users.get(socket.id);
    if (user && user.currentRoom) {
      const room = rooms.get(user.currentRoom);
      if (room) {
        socket.emit('room_users', room.users);
      }
    }
  });

  // الإبلاغ عن رسالة
  socket.on('report_message', (data) => {
    const reporter = users.get(socket.id);
    console.log(`⚠️ بلاغ من ${reporter.name} عن رسالة: ${data.messageId}`);
    
    // إرسال للإدارة
    io.emit('admin_report', {
      reporter: reporter.name,
      messageId: data.messageId,
      reason: data.reason,
      timestamp: new Date()
    });
  });

  // الخروج
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      if (user.currentRoom) {
        const room = rooms.get(user.currentRoom);
        if (room) {
          room.users = room.users.filter(u => u.id !== user.id);
          
          io.to(user.currentRoom).emit('new_message', {
            type: 'system',
            text: `[ ${user.name} غادر الغرفة ]`,
            timestamp: new Date()
          });
          
          io.to(user.currentRoom).emit('room_users', room.users);
        }
      }
      
      users.delete(socket.id);
      io.emit('users_update', Array.from(users.values()));
      
      console.log(`❌ ${user.name} قطع الاتصال`);
    }
  });
});

// REST API Routes

// دخول مستخدم
app.post('/api/login', (req, res) => {
  const { name, password, role, gender } = req.body;
  
  if (!name || !password) {
    return res.status(400).json({ error: 'البيانات غير كافية' });
  }
  
  // في التطبيق الفعلي، تحقق من قاعدة البيانات
  const user = new User(
    Math.random().toString(36).substr(2, 9),
    name,
    role || 'عضو',
    gender || 'other',
    null
  );
  
  res.json({
    success: true,
    user: user,
    token: 'dummy_token_' + user.id
  });
});

// تسجيل مستخدم جديد
app.post('/api/register', (req, res) => {
  const { name, password, email, age, gender } = req.body;
  
  if (!name || !password) {
    return res.status(400).json({ error: 'البيانات غير كافية' });
  }
  
  // في التطبيق الفعلي، احفظ في قاعدة البيانات
  const user = new User(
    Math.random().toString(36).substr(2, 9),
    name,
    'عضو',
    gender || 'other',
    null
  );
  
  res.json({
    success: true,
    user: user,
    token: 'dummy_token_' + user.id
  });
});

// قائمة الغرف
app.get('/api/rooms', (req, res) => {
  res.json(Array.from(rooms.values()));
});

// الرسائل في الغرفة
app.get('/api/room/:roomName/messages', (req, res) => {
  const room = rooms.get(req.params.roomName);
  if (!room) {
    return res.status(404).json({ error: 'الغرفة غير موجودة' });
  }
  res.json(room.messages || []);
});

// المتواجدون في الغرفة
app.get('/api/room/:roomName/users', (req, res) => {
  const room = rooms.get(req.params.roomName);
  if (!room) {
    return res.status(404).json({ error: 'الغرفة غير موجودة' });
  }
  res.json(room.users || []);
});

// إنشاء غرفة جديدة (للإدارة)
app.post('/api/rooms/create', (req, res) => {
  const { name, description } = req.body;
  
  if (rooms.has(name)) {
    return res.status(400).json({ error: 'الغرفة موجودة مسبقاً' });
  }
  
  rooms.set(name, { name, description, users: [], messages: [] });
  
  io.emit('room_created', { name, description });
  
  res.json({ success: true, room: { name, description } });
});

// صفحة رئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// معالج الأخطاء
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'خطأ في الخادم' });
});

// بدء الخادم
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
});

module.exports = server;