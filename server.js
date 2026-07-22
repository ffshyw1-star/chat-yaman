require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// حل مشكلة المسافة الفارغة في اسم مجلد الـ public تلقائياً
const publicPathNormal = path.join(__dirname, 'public');
const publicPathSpace = path.join(__dirname, ' public');
const finalPublicPath = fs.existsSync(publicPathSpace) ? publicPathSpace : publicPathNormal;

app.use(express.static(finalPublicPath));

// الاتصال بقاعدة بيانات MongoDB Atlas
const mongoURI = process.env.MONGO_URI || "mongodb+srv://admin:admin@cluster0.ywgsrhl.mongodb.net/yemen_chat_db?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoURI)
    .then(() => console.log('🟢 تم الاتصال بنجاح بقاعدة بيانات شات اليمن المطور!'))
    .catch(err => console.error('🔴 خطأ أثناء الاتصال بقاعدة البيانات:', err));

// تعريف مخطط وموديل المستخدمين لحفظ الحسابات
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// تعريف مخطط وموديل الرسائل لحفظ المحادثات
const messageSchema = new mongoose.Schema({
    room: { type: String, required: true },
    user: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

/* ===== مسارات الصفحات والتوجيه (Routes) ===== */

app.get('/', (req, res) => {
    res.sendFile(path.join(finalPublicPath, 'index.html'));
});

// تحويل تلقائي للمسارات الفرعية لمنع خطأ الـ Cannot GET
const htmlFiles = ['guest.html', 'login.html', 'register.html', 'rooms.html', 'chat.html', 'admin.html'];
htmlFiles.forEach(file => {
    app.get(`/pages/${file}`, (req, res) => {
        res.sendFile(path.join(finalPublicPath, file));
    });
});

// مسار معالجة إنشاء حساب جديد
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.send('<script>alert("الرجاء ملء جميع الحقول"); window.history.back();</script>');
        }
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.send('<script>alert("اسم المستخدم مسجل مسبقاً"); window.history.back();</script>');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.send('<script>alert("تم إنشاء الحساب بنجاح!"); window.location.href = "/pages/login.html";</script>');
    } catch (err) {
        res.status(500).send("خطأ في السيرفر أثناء التسجيل");
    }
});

// مسار معالجة تسجيل الدخول
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.send('<script>alert("اسم المستخدم أو كلمة المرور غير صحيحة"); window.history.back();</script>');
        }
        res.send(`<script>
            localStorage.setItem("chat_username", "${username}");
            window.location.href = "/pages/rooms.html";
        </script>`);
    } catch (err) {
        res.status(500).send("خطأ في السيرفر أثناء تسجيل الدخول");
    }
});

/* ===== إدارة اتصالات شات اليمن المطور (Socket.io) ===== */
io.on('connection', (socket) => {
    let currentRoom = '';
    let currentUser = '';

    // عند دخول مستخدم إلى غرفة محددة
    socket.on('join', async (data) => {
        if (!data || !data.name || !data.room) return;
        currentRoom = data.room;
        currentUser = data.name;
        socket.join(currentRoom);
        
        // استرجاع المحادثات القديمة المحفوظة في قاعدة البيانات لهذه الغرفة وبثها للمستخدم الجديد فقط
        try {
            const oldMessages = await Message.find({ room: currentRoom }).sort({ timestamp: 1 }).limit(50);
            oldMessages.forEach(msg => {
                socket.emit('msg', {
                    user: msg.user,
                    text: msg.text,
                    time: msg.timestamp.toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
                });
            });
        } catch (err) {
            console.error('خطأ أثناء جلب الرسائل القديمة:', err);
        }

        // بث رسالة انضمام للغرفة
        io.to(currentRoom).emit('msg', {
            user: 'نظام الشات 👑',
            text: `🟢 انضم المطور [ ${currentUser} ] إلى الغرفة الآن.`,
            time: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
        });
    });

    // عند إرسال رسالة جديدة
    socket.on('message', async (data) => {
        if (!data || !data.text) return;
        
        const timeString = new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });

        // حفظ الرسالة فوراً في الـ Database
        try {
            const newMessage = new Message({
                room: currentRoom,
                user: currentUser || 'زائر',
                text: data.text
            });
            await newMessage.save();
        } catch (err) {
            console.error('خطأ أثناء حفظ الرسالة:', err);
        }

        // بث الرسالة لجميع المتواجدين في نفس الغرفة
        io.to(currentRoom).emit('msg', {
            user: currentUser || 'زائر',
            text: data.text,
            time: timeString
        });
    });

    socket.on('disconnect', () => {
        if (currentRoom && currentUser) {
            io.to(currentRoom).emit('msg', {
                user: 'نظام الشات 👑',
                text: `🔴 غادر [ ${currentUser} ] الغرفة.`,
                time: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
            });
        }
    });
});

// تشغيل الخادم
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل بنجاح على المنفذ: ${PORT}`);
});
