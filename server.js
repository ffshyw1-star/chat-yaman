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
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// التعرف التلقائي الذكي على مجلد public سواء بمسافة أو بدون
const getPublicPath = () => {
    const p1 = path.join(__dirname, 'public');
    const p2 = path.join(__dirname, ' public');
    return fs.existsSync(p2) ? p2 : p1;
};
const finalPath = getPublicPath();
app.use(express.static(finalPath));

// ربط قاعدة البيانات MongoDB Atlas
const mongoURI = process.env.MONGO_URI || "mongodb+srv://admin:admin@cluster0.ywgsrhl.mongodb.net/yemen_chat_db?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoURI)
    .then(() => console.log('🟢 تم الاتصال بنجاح بقاعدة بيانات شات اليمن المطور!'))
    .catch(err => console.error('🔴 خطأ أثناء الاتصال بقاعدة البيانات:', err));

// مخطط وموديل حفظ الرسائل والمحادثات القديمة
const Msg = mongoose.model('ChatMsg', new mongoose.Schema({
    room: String, user: String, gender: String, text: String, time: String, date: { type: Date, default: Date.now }
}));

// مخطط وموديل حسابات الأعضاء المسجلين
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

/* ===== نظام التوجيه الذكي والشامل (Routes) لمنع أخطاء Cannot GET ===== */

// فتح الصفحة الرئيسية تلقائياً
app.get('/', (req, res) => res.sendFile(path.join(finalPath, 'index.html')));

// معالجة طلبات الملفات المباشرة التي تحتوي على /pages/
app.get('/pages/:file', (req, res) => {
    const fullPath = path.join(finalPath, req.params.file);
    if (fs.existsSync(fullPath)) {
        return res.sendFile(fullPath);
    }
    res.sendFile(path.join(finalPath, 'index.html'));
});

// معالجة طلبات المسارات المتنوعة لضمان استقرار الروابط
app.get('/:page', (req, res) => {
    let file = req.params.page;
    if (file.startsWith('pages/')) {
        file = file.replace('pages/', '');
    }
    const fullPath = path.join(finalPath, file);
    if (fs.existsSync(fullPath)) {
        return res.sendFile(fullPath);
    }
    res.sendFile(path.join(finalPath, 'index.html'));
});

/* ===== مسارات التوثيق (تسجيل الحسابات والدخول) ===== */

// إنشاء حساب عضو جديد
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

// تسجيل دخول الأعضاء
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

/* ===== إدارة اتصالات Socket.io للدردشة الفورية والفاخرة ===== */
io.on('connection', (socket) => {
    let uRoom = '', uName = '', uGender = '';

    socket.on('join', async (data) => {
        if (!data?.name || !data?.room) return;
        uRoom = data.room; uName = data.name; uGender = data.gender || 'male';
        socket.join(uRoom);

        // استرجاع آخر 40 رسالة قديمة من قاعدة البيانات للغرفة المستهدفة لتظهر فور الدخول
        try {
            const history = await Msg.find({ room: uRoom }).sort({ date: 1 }).limit(40);
            history.forEach(m => socket.emit('msg', { user: m.user, text: m.text, gender: m.gender, time: m.time }));
        } catch (err) {
            console.error('خطأ جلب الأرشيف:', err);
        }

        // بث إشعار ترحيبي عند دخول الغرفة
        io.to(uRoom).emit('msg', { user: 'نظام الشات 👑', text: `🟢 انضم المطور [ ${uName} ] إلى الغرفة الآن.`, time: 'الآن', isSystem: true });
    });

    // استقبال الرسائل النصية وبثها فوراً وحفظها في الداتابيز
    socket.on('message', async (data) => {
        if (!data?.text) return;
        const time = new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });
        
        await new Msg({ room: uRoom, user: uName, gender: uGender, text: data.text, time }).save();
        io.to(uRoom).emit('msg', { user: uName, text: data.text, gender: uGender, time });
    });

    // إشعار بقية المستخدمين عند خروج العضو
    socket.on('disconnect', () => {
        if (uRoom && uName) {
            io.to(uRoom).emit('msg', { user: 'نظام الشات 👑', text: `🔴 غادر [ ${uName} ] الغرفة.`, time: 'الآن', isSystem: true });
        }
    });
});

// تشغيل الخادم على منفذ Render المخصص
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 السيرفر يعمل بنجاح على المنفذ: ${PORT}`));
