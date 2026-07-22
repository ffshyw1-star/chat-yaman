require('dotenv').config(); // تفعيل قراءة متغيرات البيئة
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// إعدادات قراءة البيانات والملفات الثابتة
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// الاتصال بقاعدة بيانات MongoDB Atlas بشكل آمن
const mongoURI = process.env.MONGO_URI || "mongodb+srv://admin:admin@cluster0.ywgsrhl.mongodb.net/yemen_chat_db?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI)
    .then(() => console.log('🟢 تم الاتصال بنجاح بقاعدة بيانات شات اليمن المطور!'))
    .catch(err => console.error('🔴 خطأ أثناء الاتصال بقاعدة البيانات:', err));

// ربط اتصالات Socket.io مع واجهات المستخدم
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

// تشغيل الخادم على المنفذ المخصص
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل بنجاح على المنفذ: ${PORT}`);
});
