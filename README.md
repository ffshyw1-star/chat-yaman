# 🇾🇪 شات اليمن — خادم WebSocket للدردشة الحية

خادم Node.js يدير محادثات WebSocket لغرف الدردشة العربية.
يدعم: الدخول، الغرف، الرسائل، مؤشر الكتابة، المتصلون،
الإعادة التلقائية، Rate-limiting، حماية XSS.

## التشغيل

    npm install
    npm start

ثم: http://localhost:3000

## مسارات REST

- POST /api/login   — إصدار توكن (JSON: {name, role, country})
- GET  /api/health  — إحصائيات الخادم وعدد المتصلين
