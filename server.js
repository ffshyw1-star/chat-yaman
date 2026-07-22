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

// إعدادات قراءة البيانات القادمة من نماذج الـ HTML (Form Data)
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

/* ===== مسارات الصفحات والتوجيه (Routes) ===== */

// المسار الرئيسي فتح صفحة index.html المباشرة تلقائياً
app.get('/', (req, res) => {
    res.sendFile(path.join(finalPublicPath, 'index.html'));
});

// مسار معالجة إنشاء حساب جديد من صفحة register.html
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

        res.send('<script>alert("تم إنشاء الحساب بنجاح!"); window.location.href = "/login.html";</script>');
    } catch (err) {
        res.status(500).send("خطأ في السيرفر أثناء التسجيل");
    }
});

// مسار معالجة تسجيل الدخول من صفحة login.html
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.send('<script>alert("اسم المستخدم أو كلمة المرور غير صحيحة"); window.history.back();</script>');
        }

        // التوجيه لصفحة الغرف مباشرة بعد نجاح تسجيل الدخول
        res.send(`<script>
            localStorage.setItem("chat_username", "${username}");
            window.location.href = "/rooms.html";
        </script>`);
    } catch (err) {
        res.status(500).send("خطأ في السيرفر أثناء تسجيل الدخول");
    }
});


/* ===== إدارة اتصالات شات اليمن المطور (Socket.io) ===== */
io.on('connection', (socket) => {
    let currentRoom = '';
    let currentUser = '';

    socket.on('join', (data) => {
        if (!data || !data.name || !data.room) return;
        currentRoom = data.room;
        currentUser = data.name;
        socket.join(currentRoom);
        
        io.to(currentRoom).emit('msg', {
            user: 'نظام الشات 👑',
            text: `🟢 انضم المطور [ ${currentUser} ] إلى الغرفة الآن.`,
            time: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
        });
    });

    socket.on('message', (data) => {
        if (!data || !data.text) return;
        io.to(currentRoom).emit('msg', {
            user: currentUser || 'زائر',
            text: data.text,
            time: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
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
