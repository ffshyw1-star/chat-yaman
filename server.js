
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const session = require('express-session');
const sharedSession = require('express-socket.io-session');
const bcrypt = require('bcrypt');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// إعدادات Multer لرفع الملفات
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// قواعد البيانات المؤقتة (للاستخدام البسيط، للديمو)
// للمشروع الحقيقي استخدم MongoDB أو PostgreSQL
let users = []; // { id, username, password, email, rank, photo, cover, country, gender, age, bio, status, friends, likes, privacy, muted, banned, ip }
let messages = []; // { id, room, sender, text, type, timestamp, deleted, reported }
let rooms = [
    { id: 'general', name: '🌎 غرفة العامة', icon: '🌎', description: 'الغرفة العامة للجميع' },
    { id: 'yemen', name: '🇾🇪 غرفة اليمن', icon: '🇾🇪', description: 'غرفة اليمن' },
    { id: 'algeria', name: '🇩🇿 غرفة الجزائر', icon: '🇩🇿', description: 'غرفة الجزائر' },
    { id: 'egypt', name: '🇪🇬 غرفة مصر', icon: '🇪🇬', description: 'غرفة مصر' }
];
let reports = [];
let news = [];
let friendRequests = [];
let likes = [];

// رتب المستخدمين
const RANKS = {
    visitor: { name: 'زائر', level: 0 },
    member: { name: 'عضو', level: 1 },
    premium: { name: '💎 مميز', level: 2 },
    supervisor: { name: '🛡️ مشرف', level: 3 },
    admin: { name: '☆ إدارة', level: 4 },
    superadmin: { name: '⭐ ادمن', level: 5 },
    owner: { name: '👑 المالك', level: 6 }
};

// إعداد Express
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// إعداد الجلسات
const sessionMiddleware = session({
    secret: 'yemen-chat-secret-key',
    resave: true,
    saveUninitialized: true
});
app.use(sessionMiddleware);
io.use(sharedSession(sessionMiddleware, { autoSave: true }));

// ملفات ثابتة
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== API Routes ====================

// تسجيل مستخدم جديد
app.post('/api/register', async (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password || !email) return res.json({ success: false, message: 'جميع الحقول مطلوبة' });
    if (users.find(u => u.username === username)) return res.json({ success: false, message: 'اسم المستخدم موجود' });
    if (users.find(u => u.email === email)) return res.json({ success: false, message: 'البريد الإلكتروني موجود' });

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
        bio: 'مرحباً، أنا جديد في شات اليمن',
        status: '🟢 متصل',
        friends: [],
        likes: [],
        privacy: 'all',
        muted: false,
        banned: false,
        ip: req.ip,
        balance: 0,
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
    if (!user) return res.json({ success: false, message: 'اسم المستخدم غير موجود' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ success: false, message: 'كلمة المرور خاطئة' });
    if (user.banned) return res.json({ success: false, message: 'حسابك محظور' });
    user.status = '🟢 متصل';
    user.lastSeen = new Date().toISOString();
    req.session.user = user;
    res.json({ success: true, user });
});

// الدخول كزائر
app.post('/api/guest', (req, res) => {
    const guest = {
        id: 'guest-' + uuidv4().slice(0, 8),
        username: 'زائر_' + Math.floor(Math.random() * 10000),
        rank: 'visitor',
        photo: '/default-avatar.png',
        status: '🟢 متصل',
        privacy: 'all',
        banned: false,
        balance: 0
    };
    users.push(guest);
    req.session.user = guest;
    res.json({ success: true, user: guest });
});

// تسجيل الخروج
app.post('/api/logout', (req, res) =>
