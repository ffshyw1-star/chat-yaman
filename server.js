const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const session = require('express-session');
const sharedSession = require('express-socket.io-session');
const bcrypt = require('bcryptjs'); // استخدام النسخة المستقرة المتوافقة مع ريندر
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// الاتصال بقاعدة البيانات
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://admin:admin@cluster0.ywgsrhl.mongodb.net/yemen_chat_db?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log('🟢 MongoDB Connected'))
    .catch(err => console.error('🔴 MongoDB Connection Error:', err));

const RANKS = {
    visitor: { name: 'زائر', level: 0, color: '#888' },
    member: { name: 'عضو', level: 1, color: '#2196F3' },
    premium: { name: '💎 مميز', level: 2, color: '#FF9800' },
    supervisor: { name: '🛡️ مشرف', level: 3, color: '#4CAF50' },
    admin: { name: '☆ إدارة', level: 4, color: '#E91E63' },
    superadmin: { name: '⭐ ادمن', level: 5, color: '#9C27B0' },
    owner: { name: '👑 المالك', level: 6, color: '#FFD700' }
};

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

const rooms = [
    { id: 'general', name: '🌎 غرفة العامة', icon: '🌎', description: 'الغرفة العامة للجميع' },
    { id: 'yemen', name: '🇾🇪 غرفة اليمن', icon: '🇾🇪', description: 'غرفة اليمن' },
    { id: 'algeria', name: '🇩🇿 غرفة الجزائر', icon: '🇩🇿', description: 'غرفة الجزائر' },
    { id: 'egypt', name: '🇪🇬 غرفة مصر', icon: '🇪🇬', description: 'غرفة مصر' }
];

app.post('/api/register', async (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password || !email) return res.json({ success: false, message: 'جميع الحقول مطلوبة' });
    try {
        const userExists = await User.findOne({ $or: [{ username }, { email }] });
        if (userExists) return res.json({ success: false, message: 'اسم المستخدم أو البريد الإلكتروني مسجل بالفعل' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, email, rank: 'member', status: '🟢 متصل', ip: req.ip });
        await newUser.save();
        req.session.user = { id: newUser._id, username: newUser.username, rank: newUser.rank };
        res.json({ success: true, user: newUser });
    } catch (err) { res.json({ success: false, message: 'حدث خطأ أثناء التسجيل' }); }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.json({ success: false, message: 'اسم المستخدم غير موجود' });
        if (!user.password) return res.json({ success: false, message: 'حساب زائر، لا يمكن تسجيل الدخول به' });
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.json({ success: false, message: 'كلمة المرور خاطئة' });
        if (user.banned) return res.json({ success: false, message: 'حسابك محظور من دخول الدردشة' });
        user.status = '🟢 متصل'; user.lastSeen = new Date(); await user.save();
        req.session.user = { id: user._id, username: user.username, rank: user.rank };
        res.json({ success: true, user });
    } catch (err) { res.json({ success: false, message: 'خطأ في الخادم' }); }
});

app.post('/api/guest', async (req, res) => {
    try {
        const guestName = 'زائر_' + Math.floor(Math.random() * 10000);
        const guest = new User({ username: guestName, rank: 'visitor', status: '🟢 متصل', ip: req.ip });
        await guest.save();
        req.session.user = { id: guest._id, username: guest.username, rank: guest.rank };
        res.json({ success: true, user: guest });
    } catch (err) { res.json({ success: false, message: 'فشل دخول الزائر' }); }
});

app.post('/api/logout', async (req, res) => {
    if (req.session.user) { await User.findByIdAndUpdate(req.session.user.id, { status: '🔴 غير متصل', lastSeen: new Date() }); }
    req.session.destroy(); res.redirect('/');
});

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

// إدارة اتصالات الـ Socket
io.on('connection', async (socket) => {
    const sessionUser = socket.handshake.session?.user;
    if (!sessionUser) { socket.disconnect(); return; }
    
    const dbUser = await User.findById(sessionUser.id);
    if (!dbUser || dbUser.banned) { 
        socket.emit('kick-ban', { message: 'تم حظرك من السيرفر' }); 
        socket.disconnect(); 
        return; 
    }

    socket.on('join-room', async (roomId) => {
        socket.join(roomId); 
        socket.currentRoom = roomId;
        const roomMessages = await Message.find({ room: roomId }).sort({ timestamp: -1 }).limit(50);
        socket.emit('load-messages', roomMessages.reverse());
        socket.to(roomId).emit('user-joined', { id: dbUser._id, username: dbUser.username, rank: dbUser.rank });
        
        // تحديث قائمة المتواجدين للجميع عند دخول مستخدم جديد
        const onlineUsers = await User.find({ status: '🟢 متصل' }).select('-password');
        io.emit('update-user-list', onlineUsers);
    });

    socket.on('send-message', async (data) => {
        const { room, text } = data; 
        if (!text || !text.trim()) return;
        
        const currentUser = await User.findById(sessionUser.id);
        if (!currentUser || currentUser.banned) { 
            socket.emit('kick-ban', { message: 'أنت محظور' }); 
            return socket.disconnect(); 
        }
        if (currentUser.muted) { 
            socket.emit('system-alert', { message: '🤐 تم كتم صوتك من قبل الإدارة.' }); 
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

    // ميزة الكتم من قبل الإدارة والمشرفين
    socket.on('admin-mute', async ({ targetUserId }) => {
        const adminUser = await User.findById(sessionUser.id);
        const targetUser = await User.findById(targetUserId);
        if (!adminUser || !targetUser) return;

        const adminLevel = RANKS[adminUser.rank]?.level || 0;
        const targetLevel = RANKS[targetUser.rank]?.level || 0;

        // التحقق من صلاحيات المشرفين (رتبة مستوى 3 فما فوق) وأن رتبته أعلى من الشخص المستهدف
        if (adminLevel >= 3 && adminLevel > targetLevel) {
            targetUser.muted = true;
            await targetUser.save();
            
            // إرسال تنبيه للنظام في الغرفة العامة أو الغرفة الحالية
            io.emit('system-alert', { message: `🔇 قام المشرف ${adminUser.username} بكتم صوت ${targetUser.username}.` });
        } else {
            socket.emit('system-alert', { message: '❌ لا تملك صلاحيات كافية لتنفيذ هذا الإجراء.' });
        }
    });

    // ميزة إلغاء الكتم
    socket.on('admin-unmute', async ({ targetUserId }) => {
        const adminUser = await User.findById(sessionUser.id);
        const targetUser = await User.findById(targetUserId);
        if (!adminUser || !targetUser) return;

        const adminLevel = RANKS[adminUser.rank]?.level || 0;
        if (adminLevel >= 3) {
            targetUser.muted = false;
            await targetUser.save();
            io.emit('system-alert', { message: `🔊 قام المشرف ${adminUser.username} بإلغاء كتم ${targetUser.username}.` });
        }
    });

    // ميزة الحظر (Ban) من قبل الإدارة
    socket.on('admin-ban', async ({ targetUserId }) => {
