
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const session = require('express-session');
const sharedSession = require('express-socket.io-session');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// إعداد الجلسات
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'yemen-chat-secret-2024',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
});

app.use(sessionMiddleware);
io.use(sharedSession(sessionMiddleware, { autoSave: true }));

// ملفات ثابتة
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// بيانات مؤقتة (للديمو) - استخدم MongoDB للإنتاج
let users = [];
let messages = [];
let rooms = [
    { id: 'general', name: '🌎 غرفة العامة', icon: '🌎', description: 'الغرفة العامة للجميع', createdAt: new Date() },
    { id: 'yemen', name: '🇾🇪 غرفة اليمن', icon: '🇾🇪', description: 'غرفة اليمن', createdAt: new Date() },
    { id: 'algeria', name: '🇩🇿 غرفة الجزائر', icon: '🇩🇿', description: 'غرفة الجزائر', createdAt: new Date() },
    { id: 'egypt', name: '🇪🇬 غرفة مصر', icon: '🇪🇬', description: 'غرفة مصر', createdAt: new Date() }
];
let reports = [];
let friendRequests = [];

// تعريف الرتب - بدون أخطاء
const RANKS = {
    visitor: { name: 'زائر', level: 0, color: '#888' },
    member: { name: 'عضو', level: 1, color: '#2196F3' },
    premium: { name: '💎 مميز', level: 2, color: '#FF9800' },
    supervisor: { name: '🛡️ مشرف', level: 3, color: '#4CAF50' },
    admin: { name: '☆ إدارة', level: 4, color: '#E91E63' },
    superadmin: { name: '⭐ ادمن', level: 5, color: '#9C27B0' },
    owner: { name: '👑 المالك', level: 6, color: '#FFD700' }
};

// ====================== API Routes ======================

// التسجيل
app.post('/api/register', async (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password || !email) {
        return res.json({ success: false, message: 'جميع الحقول مطلوبة' });
    }
    if (users.find(u => u.username === username)) {
        return res.json({ success: false, message: 'اسم المستخدم موجود مسبقاً' });
    }
    if (users.find(u => u.email === email)) {
        return res.json({ success: false, message: 'البريد الإلكتروني مستخدم' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: uuidv4(),
        username,
        password: hashedPassword,
        email,
        rank: 'member',
        photo: '/default-avatar.png',
        cover: '/default-cover.jpg',
        country: 'اليمن',
        gender: 'ذكر',
        age: 20,
        bio: 'مرحباً! أنا جديد في شات اليمن',
        status: '🟢 متصل',
        friends: [],
        likes: [],
        privacy: 'all',
        muted: false,
        banned: false,
        balance: 0,
        ip: req.ip,
        lastSeen: new Date().toISOString()
    };
    users.push(newUser);
    req.session.user = newUser;
    res.json({ success: true, user: newUser });
});

// تسجيل الدخول
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if (!user) {
        return res.json({ success: false, message: 'اسم المستخدم غير موجود' });
    }
    if (!user.password) {
        return res.json({ success: false, message: 'حساب زائر، لا يمكن تسجيل الدخول به' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
        return res.json({ success: false, message: 'كلمة المرور خاطئة' });
    }
    if (user.banned) {
        return res.json({ success: false, message: 'حسابك محظور' });
    }
    user.status = '🟢 متصل';
    user.lastSeen = new Date().toISOString();
    req.session.user = user;
    res.json({ success: true, user });
});

// دخول زائر
app.post('/api/guest', (req, res) => {
    const guest = {
        id: 'guest-' + uuidv4().slice(0, 8),
        username: 'زائر_' + Math.floor(Math.random() * 10000),
        rank: 'visitor',
        photo: '/default-avatar.png',
        status: '🟢 متصل',
        privacy: 'all',
        banned: false,
        balance: 0,
        lastSeen: new Date().toISOString()
    };
    users.push(guest);
    req.session.user = guest;
    res.json({ success: true, user: guest });
});

// تسجيل الخروج
app.post('/api/logout', (req, res) => {
    if (req.session.user) {
        const user = users.find(u => u.id === req.session.user.id);
        if (user) {
            user.status = '🔴 غير متصل';
            user.lastSeen = new Date().toISOString();
        }
    }
    req.session.destroy();
    res.redirect('/');
});

// التحقق من الجلسة
app.get('/api/session', (req, res) => {
    if (req.session.user) {
        const user = users.find(u => u.id === req.session.user.id);
        if (user) {
            return res.json({ success: true, user });
        }
    }
    res.json({ success: false, user: null });
});

// الحصول على قائمة الغرف
app.get('/api/rooms', (req, res) => {
    res.json({ success: true, rooms });
});

// الحصول على قائمة المستخدمين المتصلين
app.get('/api/users', (req, res) => {
    const onlineUsers = users.filter(u => u.status === '🟢 متصل');
    res.json({ success: true, users: onlineUsers });
});

// ====================== Socket.io (الدردشة الحية) ======================
io.on('connection', (socket) => {
    console.log('مستخدم متصل:', socket.id);
    
    const user = socket.handshake.session.user;
    if (!user) {
        socket.disconnect();
        return;
    }

    // انضمام إلى غرفة
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        socket.currentRoom = roomId;
        console.log(`${user.username} انضم إلى ${roomId}`);
        
        // إرسال آخر 50 رسالة
        const roomMessages = messages
            .filter(m => m.room === roomId)
            .slice(-50);
        socket.emit('load-messages', roomMessages);
        
        // إعلام المستخدمين الآخرين
        socket.to(roomId).emit('user-joined', {
            id: user.id,
            username: user.username,
            rank: user.rank
        });
    });

    // إرسال رسالة
    socket.on('send-message', (data) => {
        const { room, text } = data;
        if (!text || !text.trim()) return;
        
        const message = {
            id: uuidv4(),
            room: room || 'general',
            senderId: user.id,
            senderName: user.username,
            senderRank: user.rank,
            text: text.trim(),
            type: 'text',
            timestamp: new Date().toISOString(),
            deleted: false,
            reported: false
        };
        
        messages.push(message);
        io.to(room).emit('new-message', message