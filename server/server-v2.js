const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const db = require('../database/queries');
const { verifyToken, createToken, verifyAdmin } = require('./auth-middleware');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// متغيرات الجلسات النشطة
const activeSessions = new Map(); // socketId -> userId
const userRooms = new Map(); // userId -> roomId

// ==================== API Routes ====================

// تسجيل مستخدم جديد
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email, gender, age } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'البيانات غير كافية' });
    }
    
    const user = await db.registerUser(username, password, email, gender, age);
    const token = createToken(user.id, user.username, user.role);
    
    res.status(201).json({
      success: true,
      user,
      token
    });
  } catch (error) {
    console.error('❌ خطأ في التسجيل:', error);
    res.status(500).json({ error: error.message });
  }
});

// تسجيل الدخول
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'البيانات غير كافية' });
    }
    
    const user = await db.loginUser(username, password);
    const token = createToken(user.id, user.username, user.role);
    
    res.json({
      success: true,
      user,
      token
    });
  } catch (error) {
    console.error('❌ خطأ في تسجيل الدخول:', error);
    res.status(401).json({ error: error.message });
  }
});

// الحصول على بيانات المستخدم
app.get('/api/user/:id', verifyToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// الحصول على جميع الغرف
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await db.getAllRooms();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// إنشاء غرفة جديدة (إدارة فقط)
app.post('/api/rooms/create', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const room = await db.createRoom(name, description, req.userId);
    
    io.emit('room_created', room);
    
    res.status(201).json({
      success: true,
      room
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// الحصول على رسائل الغرفة
app.get('/api/rooms/:roomId/messages', async (req, res) => {
  try {
    const messages = await db.getRoomMessages(req.params.roomId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// الحصول على مستخدمي الغرفة
app.get('/api/rooms/:roomId/users', async (req, res) => {
  try {
    const users = await db.getRoomUsers(req.params.roomId);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Socket.io Events ====================

io.on('connection', (socket) => {
  console.log('✅ مستخدم جديد متصل:', socket.id);
  
  // تسجيل دخول المستخدم
  socket.on('user_login', async (data) => {
    try {
      const { userId } = data;
      activeSessions.set(socket.id, userId);
      
      const user = await db.getUserById(userId);
      
      socket.emit('login_success', {
        userId: user.id,
        username: user.username,
        role: user.role,
        credit: user.credit
      });
      
      io.emit('user_online', {
        userId: user.id,
        username: user.username
      });
      
      console.log(`👤 ${user.username} دخل النظام`);
    } catch (error) {
      socket.emit('error', error.message);
    }
  });
  
  // الدخول للغرفة
  socket.on('join_room', async (data) => {
    try {
      const { roomId } = data;
      const userId = activeSessions.get(socket.id);
      
      if (!userId) {
        socket.emit('error', 'لم يتم تسجيل الدخول');
        return;
      }
      
      // إنهاء الجلسة السابقة
      if (userRooms.has(userId)) {
        const oldRoomId = userRooms.get(userId);
        await db.endRoomSession(userId, oldRoomId);
        socket.leave(`room_${oldRoomId}`);
      }
      
      // إنشاء جلسة جديدة
      await db.addRoomSession(userId, roomId, socket.id);
      userRooms.set(userId, roomId);
      
      socket.join(`room_${roomId}`);
      
      const user = await db.getUserById(userId);
      const messages = await db.getRoomMessages(roomId);
      const roomUsers = await db.getRoomUsers(roomId);
      
      socket.emit('room_joined', {
        roomId,
        messages,
        users: roomUsers
      });
      
      io.to(`room_${roomId}`).emit('user_joined', {
        userId: user.id,
        username: user.username,
        role: user.role
      });
      
      console.log(`🚪 ${user.username} دخل الغرفة ${roomId}`);
    } catch (error) {
      socket.emit('error', error.message);
    }
  });
  
  // إرسال رسالة
  socket.on('send_message', async (data) => {
    try {
      const { text } = data;
      const userId = activeSessions.get(socket.id);
      const roomId = userRooms.get(userId);
      
      if (!userId || !roomId) {
        socket.emit('error', 'لم يتم تحديد الغرفة');
        return;
      }
      
      const message = await db.addMessage(userId, roomId, text);
      const user = await db.getUserById(userId);
      
      io.to(`room_${roomId}`).emit('new_message', {
        messageId: message.message_id,
        userId: user.id,
        username: user.username,
        gender: user.gender,
        role: user.role,
        avatar_color: user.avatar_color,
        text,
        timestamp: message.created_at
      });
      
      console.log(`💬 رسالة من ${user.username}`);
    } catch (error) {
      socket.emit('error', error.message);
    }
  });
  
  // مغادرة الغرفة
  socket.on('leave_room', async (data) => {
    try {
      const userId = activeSessions.get(socket.id);
      const roomId = userRooms.get(userId);
      
      if (userId && roomId) {
        await db.endRoomSession(userId, roomId);
        userRooms.delete(userId);
        socket.leave(`room_${roomId}`);
        
        const user = await db.getUserById(userId);
        
        io.to(`room_${roomId}`).emit('user_left', {
          userId: user.id,
          username: user.username
        });
      }
    } catch (error) {
      console.error('❌ خطأ في مغادرة الغرفة:', error);
    }
  });
  
  // قطع الاتصال
  socket.on('disconnect', async () => {
    try {
      const userId = activeSessions.get(socket.id);
      
      if (userId) {
        const roomId = userRooms.get(userId);
        if (roomId) {
          await db.endRoomSession(userId, roomId);
          io.to(`room_${roomId}`).emit('user_left', { userId });
        }
        
        activeSessions.delete(socket.id);
        userRooms.delete(userId);
        
        io.emit('user_offline', { userId });
      }
      
      console.log(`❌ المستخدم قطع الاتصال: ${socket.id}`);
    } catch (error) {
      console.error('❌ خطأ في قطع الاتصال:', error);
    }
  });
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// معالج الأخطاء
app.use((err, req, res, next) => {
  console.error('❌ خطأ:', err);
  res.status(500).json({ error: 'خطأ في الخادم' });
});

// بدء الخادم
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`💾 قاعدة البيانات: ${process.env.DB_NAME}`);
});

module.exports = server;