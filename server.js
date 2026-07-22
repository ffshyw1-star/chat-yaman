require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// التعرف التلقائي على مجلد public سواء بمسافة أو بدون
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
    .then(() => console.log('🟢 متصل بقاعدة البيانات بنجاح'))
    .catch(err => console.error('🔴 خطأ قاعدة البيانات:', err));

// موديل حفظ الرسائل
const Msg = mongoose.model('ChatMsg', new mongoose.Schema({
    room: String, user: String, gender: String, text: String, time: String, date: { type: Date, default: Date.now }
}));

// نظام التوجيه الذكي لمنع خطأ Cannot GET
app.get('/', (req, res) => res.sendFile(path.join(finalPath, 'index.html')));
app.get('/:page', (req, res) => {
    const file = req.params.page.replace('pages/', '');
    const fullPath = path.join(finalPath, file);
    if (fs.existsSync(fullPath)) return res.sendFile(fullPath);
    res.sendFile(path.join(finalPath, 'index.html'));
});

// إدارة اتصالات Socket.io للدردشة الفورية
io.on('connection', (socket) => {
    let uRoom = '', uName = '', uGender = '';

    socket.on('join', async (data) => {
        if (!data?.name || !data?.room) return;
        uRoom = data.room; uName = data.name; uGender = data.gender || 'male';
        socket.join(uRoom);

        // جلب آخر 40 رسالة قديمة من الداتابيز للغرفة
        const history = await Msg.find({ room: uRoom }).sort({ date: 1 }).limit(40);
        history.forEach(m => socket.emit('msg', { user: m.user, text: m.text, gender: m.gender, time: m.time }));

        // إشعار دخول زائر جديد
        io.to(uRoom).emit('msg', { user: 'نظام الشات 👑', text: `🟢 انضم المطور [ ${uName} ] إلى الغرفة.`, time: 'الآن', isSystem: true });
    });

    socket.on('message', async (data) => {
        if (!data?.text) return;
        const time = new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });
        
        // حفظ وإرسال الرسالة فوراً
        await new Msg({ room: uRoom, user: uName, gender: uGender, text: data.text, time }).save();
        io.to(uRoom).emit('msg', { user: uName, text: data.text, gender: uGender, time });
    });

    socket.on('disconnect', () => {
        if (uRoom && uName) io.to(uRoom).emit('msg', { user: 'نظام الشات 👑', text: `🔴 غادر [ ${uName} ] الغرفة.`, time: 'الآن', isSystem: true });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 السيرفر يعمل على المنفذ: ${PORT}`));
