const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// تشغيل المجلد العام للموقع
app.use(express.static(path.join(__dirname, 'public')));

// ربط اتصالات Socket.io لشات اليمن المطور
io.on('connection', (socket) => {
    let currentRoom = '';
    let currentUser = '';

    // 1. استقبال حدث الانضمام (يجب أن يطابق كود المتصفح لديك)
    socket.on('join', (data) => {
        if (!data || !data.name || !data.room) return;
        
        currentRoom = data.room;
        currentUser = data.name;
        
        socket.join(currentRoom);
        
        // بث رسالة ترحيبية داخل الغرفة
        io.to(currentRoom).emit('msg', {
            user: 'نظام الشات 👑',
            text: `🟢 انضم المطور [ ${currentUser} ] إلى الغرفة الآن.`,
            time: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
        });
    });

    // 2. استقبال الرسائل النصية وإعادة بثها تلقائياً
    socket.on('message', (data) => {
        if (!data || !data.text) return;
        
        io.to(currentRoom).emit('msg', {
            user: currentUser || 'زائر',
            text: data.text,
            time: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
        });
    });

    // 3. عند مغادرة المستخدم
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

// تشغيل السيرفر على المنفذ المخصص من Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`سيرفر شات اليمن المطور يعمل بنجاح على المنفذ: ${PORT}`);
});
