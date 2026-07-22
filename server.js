require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" },
    maxHttpBufferSize: 1e7 // رفع الحد الأقصى للملفات إلى 10 ميجابايت للصور والصوت
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// التعرف التلقائي على مجلد الملفات الثابتة
const getPublicPath = () => {
    const p1 = path.join(__dirname, 'public');
    const p2 = path.join(__dirname, ' public');
    return fs.existsSync(p2) ? p2 : p1;
};
const finalPath = getPublicPath();
app.use(express.static(finalPath));

// إعداد مجلد لرفع الصور والمقاطع الصوتية تلقائياً
const uploadDir = path.join(finalPath, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// إعداد مكتبة Multer لرفع الملفات وتسميتها بشكل فريد
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ربط قاعدة البيانات MongoDB Atlas
const mongoURI = process.env.MONGO_URI || "mongodb+srv://admin:admin@cluster0.ywgsrhl.mongodb.net/yemen_chat_db?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoURI)
    .then(() => console.log('🟢 تم ربط السيرفر بقاعدة البيانات بنجاح!'))
    .catch(err => console.error('🔴 خطأ قاعدة البيانات:', err));

/* ===== تعريف موديلات ومخططات البيانات (Database Models) ===== */

// مخطط حسابات الأعضاء والرتب والحظر
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'عضو' }, // مالك، ادمن، إدارة، مشرف، مميز، عضو
    isBanned: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// مخطط حفظ الرسائل والوسائط (صور وصوت)
const Msg = mongoose.model('ChatMsg', new mongoose.Schema({
    room: String, user: String, role: String, gender: String, 
    text: String, fileUrl: String, fileType: String, time: String, 
    date: { type: Date, default: Date.now }
}));

// قائمة لحفظ المستخدمين المحظورين مؤقتاً (طرد من الغرفة)
const kickedUsers = new Map(); 

/* ===== مسارات الـ API والصفحات (Routes) ===== */

app.get('/', (req, res) => res.sendFile(path.join(finalPath, 'index.html')));

// مسار رفع الصور والمقاطع الصوتية من الشات
app.post('/api/upload', upload.single('chatFile'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'لم يتم اختيار ملف' });
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ fileUrl });
});

// مسارات استدعاء الصفحات تلقائياً وحل أخطاء Cannot GET
app.get('/pages/:file', (req, res) => {
    const fullPath = path.join(finalPath, req.params.file);
    if (fs.existsSync(fullPath)) return res.sendFile(fullPath);
    res.sendFile(path.join(finalPath, 'index.html'));
});

app.get('/:page', (req, res) => {
    let file = req.params.page.replace('pages/', '');
    const fullPath = path.join(finalPath, file);
    if (fs.existsSync(fullPath)) return res.sendFile(fullPath);
    res.sendFile(path.join(finalPath, 'index.html'));
});

/* ===== مسارات الحسابات والتسجيل ===== */
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const userExists = await User.findOne({ username });
        if (userExists) return res.send('<script>alert("الاسم مسجل مسبقاً"); window.history.back();</script>');
        
        // منح أول حساب يسجل رتبة "مالك" تلقائياً وبقية الحسابات "عضو"
        const count = await User.countDocuments();
        const role = count === 0 ? 'مالك' : 'عضو';

        const hashedPassword = await bcrypt.hash(password, 10);
        await new User({ username, password: hashedPassword, role }).save();
        res.send('<script>alert("تم التسجيل بنجاح!"); window.location.href = "/pages/login.html";</script>');
    } catch (err) { res.status(500).send("خطأ في التسجيل"); }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.send('<script>alert("بيانات الدخول خاطئة"); window.history.back();</script>');
        }
        if (user.isBanned) return res.send('<script>alert("حسابك محظور نهائياً من دخول الشات"); window.history.back();</script>');

        res.send(`<script>
            localStorage.setItem("chat_username", "${username}");
            localStorage.setItem("chat_role", "${user.role}");
            window.location.href = "/pages/rooms.html";
        </script>`);
    } catch (err) { res.status(500).send("خطأ في الدخول"); }
});

/* ===== نظام الدردشة الفورية والتحكم (Socket.io) ===== */
io.on('connection', (socket) => {
    let uRoom = '', uName = '', uGender = '', uRole = 'زائر';

    socket.on('join', async (data) => {
        if (!data?.name || !data?.room) return;
        uRoom = data.room; uName = data.name; uGender = data.gender || 'male';
        
        // جلب الرتبة الحقيقية إذا كان عضواً مسجلاً وإلا فهو زائر
        const dbUser = await User.findOne({ username: uName });
        uRole = dbUser ? dbUser.role : 'زائر';

        // التحقق من الحظر أو الطرد قبل الدخول للغرفة
        if (dbUser && dbUser.isBanned) {
            socket.emit('kickNotify', 'أنت محظور نهائياً من السيرفر.');
            return socket.disconnect();
        }
        if (kickedUsers.has(uName) && kickedUsers.get(uName) === uRoom) {
            socket.emit('kickNotify', 'لقد تم طردك من هذه الغرفة مؤقتاً.');
            return socket.disconnect();
        }

        socket.join(uRoom);

        // إرسال آخر 40 رسالة (نصوص، صور، أو صوتيات) للغرفة فور دخوله
        const history = await Msg.find({ room: uRoom }).sort({ date: 1 }).limit(40);
        history.forEach(m => socket.emit('msg', { 
            user: m.user, role: m.role, gender: m.gender, text: m.text, 
            fileUrl: m.fileUrl, fileType: m.fileType, time: m.time 
        }));

        io.to(uRoom).emit('msg', { user: 'نظام الشات 👑', text: `🟢 انضم [ ${uRole} ] ${uName} إلى الغرفة.`, time: 'الآن', isSystem: true });
    });

    // استقبال الرسائل والوسائط (نصوص، صور، مقاطع صوتية)
    socket.on('message', async (data) => {
        if (kickedUsers.has(uName) && kickedUsers.get(uName) === uRoom) return socket.disconnect();
        
        const time = new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });
        
        // حفظ وإرسال البيانات للغرفة
        const newMsg = new Msg({ 
            room: uRoom, user: uName, role: uRole, gender: uGender, 
            text: data.text || '', fileUrl: data.fileUrl || null, fileType: data.fileType || null, time 
        });
        await newMsg.save();

        io.to(uRoom).emit('msg', { 
            user: uName, role: uRole, gender: uGender, text: data.text, 
            fileUrl: data.fileUrl, fileType: data.fileType, time 
        });
    });

    /* ===== أفعال لوحة التحكم والإشراف (Admin Panel Controls) ===== */
    
    // 1. طرد مستخدم مؤقتاً من الغرفة
    socket.on('kickUser', ({ targetName }) => {
        const allowedRoles = ['مالك', 'ادمن', 'إدارة', 'مشرف'];
        if (!allowedRoles.includes(uRole)) return;

        kickedUsers.set(targetName, uRoom);
        io.to(uRoom).emit('adminAction', { action: 'kick', target: targetName, admin: uName });
        
        // فك الطرد تلقائياً بعد 15 دقيقة
        setTimeout(() => kickedUsers.delete(targetName), 15 * 60 * 1000);
    });

    // 2. بند حظر نهائي للمستخدم من قاعدة البيانات
    socket.on('banUser', async ({ targetName }) => {
        const allowedRoles = ['مالك', 'ادمن', 'إدارة'];
        if (!allowedRoles.includes(uRole)) return;

        await User.findOneAndUpdate({ username: targetName }, { isBanned: true });
        io.to(uRoom).emit('adminAction', { action: 'ban', target: targetName, admin: uName });
    });

    // 3. ترقية رتب المستخدمين برمجياً
    socket.on('promoteUser', async ({ targetName, newRole }) => {
        if (uRole !== 'مالك' && uRole !== 'ادمن') return;
        const validRoles = ['مالك', 'ادمن', 'إدارة', 'مشرف', 'مميز', 'عضو'];
        if (!validRoles.includes(newRole)) return;

        await User.findOneAndUpdate({ username: targetName }, { role: newRole });
        io.to(uRoom).emit('adminAction', { action: 'promote', target: targetName, role: newRole, admin: uName });
    });

    socket.on('disconnect', () => {
        if (uRoom && uName) io.to(uRoom).emit('msg', { user: 'نظام الشات 👑', text: `🔴 غادر ${uName} الغرفة.`, time: 'الآن', isSystem: true });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 سيرفر التطوير المتكامل يعمل على المنفذ: ${PORT}`));
