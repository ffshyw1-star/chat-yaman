const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const session = require('express-session');
const sharedSession = require('express-socket.io-session');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose'); // إضافة المونجوس
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// ====================== الاتصال بقاعدة البيانات ======================
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://admin:admin@cluster0.ywgsrhl.mongodb.net/yemen_chat_db?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log('🟢 تم الاتصال بقاعدة بيانات MongoDB بنجاح'))
    .catch(err => console.error('🔴 خطأ في الاتصال بقاعدة البيانات:', err));

// تعريف الرتب ومستويات الصلاحية
const RANKS = {
    visitor: { name: 'زائر', level: 0, color: '#888' },
    member: { name: 'عضو', level: 1, color: '#2196F3' },
    premium: { name: '💎 مميز', level: 2, color: '#FF9800' },
    supervisor: { name: '🛡️ مشرف', level: 3, color: '#4CAF50' },
    admin: { name: '☆ إدارة', level: 4, color: '#E91E63' },
    superadmin: { name: '⭐ ادمن', level: 5, color: '#9C27B0' },
    owner: { name: '👑 المالك', level: 6, color: '#FFD700' }
};

// ====================== Mongoose Schemas & Models ======================

// مخطط المستخدمين
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String },
    email: { type: String, unique: true, sparse: true },
    rank: { type: String, default: 'member' },
    photo: { type: String, default: '/default-avatar.png' },
    cover: { type: String, default: '/default-cover.jpg' },
    country: { type: String, default: 'اليمن' },
    gender: { type: String, default: 'ذكر' },
    age: { type: Number, default: 20 },
    bio: { type: String, default: 'مرحباً! أنا جديد في شات اليمن' },
    status: { type: String, default: '🔴 غير متصل' },
    muted: { type: Boolean, default: false },
    banned: { type: Boolean, default: false },
    balance: { type: Number, default: 0 },
    ip: String,
    lastSeen: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// مخطط الرسائل
const messageSchema = new mongoose.Schema({
    room: { type: String, default: 'general' },
    senderId: String,
    senderName: String,
    senderRank: String,
    text: String,
    type: { type: String, default: 'text' },
    timestamp: { type: Date, default: Date.now },
    deleted: { type: Boolean, default: false }
});
const Message = mongoose.model('Message', messageSchema);

// ====================== إعداد الجلسات والوسيط ======================
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'yemen-chat-secret-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
});

app.use(sessionMiddleware);
io.use(sharedSession(sessionMiddleware, { autoSave: true }));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// الغرف الثابتة
const rooms = [
    { id: 'general', name: '🌎 غرفة العامة', icon: '🌎', description: 'الغرفة العامة للجميع' },
    { id: 'yemen', name: '🇾🇪 غرفة اليمن', icon: '🇾🇪', description: 'غرفة اليمن' },
    { id: 'algeria', name: '🇩🇿 غرفة الجزائر', icon: '🇩🇿', description: 'غرفة الجزائر' },
    { id: 'egypt', name: '🇪🇬 غرفة مصر', icon: '🇪🇬', description: 'غرفة مصر' }
];

// ====================== API Routes ======================

// التسجيل
app.post('/api/register', async (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password || !email) return res.json({ success: false, message: 'جميع الحقول مطلوبة' });

    try {
        const userExists = await User.findOne({ $or: [{ username }, { email }] });
        if (userExists) return res.json({ success: false, message: 'اسم المستخدم أو البريد الإلكتروني مسجل بالفعل' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            username,
            password: hashedPassword,
            email,
            rank: 'member',
            status: '🟢 متصل',
            ip: req.ip
        });

        await newUser.save();
        req.session.user = { id: newUser._id, username: newUser.username, rank: newUser.rank };
        res.json({ success: true, user: newUser });
    } catch (err) {
        res.json({ success: false, message: 'حدث خطأ أثناء التسجيل' });
    }
});

// تسجيل الدخول
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.json({ success: false, message: 'اسم المستخدم غير موجود' });
        if (!user.password) return res.json({ success: false, message: 'حساب زائر، لا يمكن تسجيل الدخول به' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.json({ success: false, message: 'كلمة المرور خاطئة' });
        if (user.banned) return res.json({ success: false, message: 'حسابك محظور من دخول الدردشة' });

        user.status = '🟢 متصل';
        user.lastSeen = new Date();
        await user.save();

        req.session.user = { id: user._id, username: user.username, rank: user.rank };
        res.json({ success: true, user });
    } catch (err) {
        res.json({ success: false, message: 'خطأ في الخادم' });
    }
});

// دخول زائر
app.post('/api/guest', async (req, res) => {
    try {
        const guestName = 'زائر_' + Math.floor(Math.random() * 10000);
        const guest = new User({
            username: guestName,
            rank: 'visitor',
            status: '🟢 متصل',
            ip: req.ip
        });
        await guest.save();
        req.session.user = { id: guest._id, username: guest.username, rank: guest.rank };
        res.json({ success: true, user: guest });
    } catch (err) {
        res.json({ success: false, message: 'فشل دخول الزائر' });
    }
});

// تسجيل الخروج
app.post('/api/logout', async (req, res) => {
    if (req.session.user) {
        await User.findByIdAndUpdate(req.session.user.id, { status: '🔴 غير متصل', lastSeen: new Date() });
    }
    req.session.destroy();
    res.redirect('/');
});

// التحقق من الجلسة
app.get('/api/session', async (req, res) => {
    if (req.session.user) {
        const user = await User.findById(req.session.user.id);
        if (user) return res.json({ success: true, user });
    }
    res.json({ success: false, user: null });
});

app.get('/api/rooms', (req, res) => res.json({ success: true, rooms }));

app.get('/api/users', async (req, res) => {
    const onlineUsers = await User.find({ status: '🟢 متصل' }).select('-password');
    res.json({ success: true, users: onlineUsers });
});

// ====================== Socket.io (الدردشة والإشراف) ======================
io.on('connection', async (socket) => {
    const sessionUser = socket.handshake.session.user;
    if (!sessionUser) {
        socket.disconnect();
        return;
    }

    // التحقق الفوري من حالة الحظر عند الاتصال
    const dbUser = await User.findById(sessionUser.id);
    if (!dbUser || dbUser.banned) {
        socket.emit('kick-ban', { message: 'تم حظرك من السيرفر' });
        socket.disconnect();
        return;
    }

    socket.on('join-room', async (roomId) => {
        socket.join(roomId);
        socket.currentRoom = roomId;

        // جلب آخر 50 رسالة من MongoDB
        const roomMessages = await Message.find({ room: roomId }).sort({ timestamp: -1 }).limit(50);
        socket.emit('load-messages', roomMessages.reverse());

        socket.to(roomId).emit('user-joined', {
            id: dbUser._id,
            username: dbUser.username,
            rank: dbUser.rank
        });
    });

    // إرسال رسالة مع فحص الميوت والحظر
    socket.on('send-message', async (data) => {
        const { room, text } = data;
        if (!text || !text.trim()) return;

        // التحقق من قاعدة البيانات مباشرة لتفادي تجاوز العقوبات
        const currentUser = await User.findById(sessionUser.id);
        if (!currentUser || currentUser.banned) {
            socket.emit('kick-ban', { message: 'أنت محظور' });
            return socket.disconnect();
        }
        if (currentUser.muted) {
            socket.emit('system-alert', { message: '🤐 لا يمكنك إرسال رسائل، لقد تم كتم صوتك (ميوت) من قبل الإدارة.' });
            return;
        }

        const newMessage = new Message({
            room: room || 'general',
            senderId: currentUser._id,
            senderName: currentUser.username,
            senderRank: currentUser.rank,
            text: text.trim()
        });

        await newMessage.save();
        io.to(room).emit('new-message', newMessage);
    });

    // ================= نظام الإشراف (الحظر والميوت التفاعلي) =================
    
    // أمر الكتم (Mute)
    socket.on('admin-mute', async ({ targetUserId }) => {
        const adminUser = await User.findById(sessionUser.id);
        const targetUser = await User.findById(targetUserId);

        if (!adminUser || !targetUser) return;

        // التحقق من رتبة المسؤول (يجب أن يكون مشرف مستوى 3 أو أعلى، وأعلى من رتبة المستهدف)
        const adminLevel = RANKS[adminUser.rank]?.level || 0;
        const targetLevel = RANKS[targetUser.rank]?.level || 0;

        if (adminLevel >= 3 && adminLevel > targetLevel) {
            targetUser.muted = true;
            await targetUser.save();

            io.emit('user-status-updated', { userId: targetUserId, muted: true });
            io.to(socket.currentRoom).emit('new-message', {
                senderName: '🛡️ النظام',
                text: `تم كتم المستخدم [ ${targetUser.username} ] بواسطة [ ${adminUser.username} ]`,
