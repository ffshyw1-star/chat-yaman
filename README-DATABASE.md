# دليل قاعدة البيانات - شات اليمن المطور 💾

## المتطلبات

- Node.js 14+
- PostgreSQL 12+
- npm أو yarn

## التثبيت والإعداد

### 1. تثبيت PostgreSQL

#### على Windows:
```bash
# تحميل من https://www.postgresql.org/download/windows/
# اتبع معالج التثبيت
```

#### على Linux:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### على macOS:
```bash
brew install postgresql
brew services start postgresql
```

### 2. إنشاء قاعدة البيانات

```bash
# تسجيل الدخول إلى PostgreSQL
psql -U postgres

# إنشاء قاعدة البيانات
CREATE DATABASE chat_yaman;

# الخروج
\q
```

### 3. تشغيل مخطط قاعدة البيانات

```bash
# تشغيل ملف schema.sql
psql -U postgres -d chat_yaman -f database/schema.sql
```

### 4. تثبيت الحزم

```bash
npm install
```

### 5. إعداد متغيرات البيئة

```bash
cp .env.example .env
```

ثم عدّل ملف `.env` بالقيم الصحيحة:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chat_yaman
DB_USER=postgres
DB_PASSWORD=your_password
```

### 6. تشغيل التطبيق

```bash
# للتطوير (مع nodemon)
npm run dev

# للإنتاج
npm start
```

## الجداول الرئيسية

### جدول `users` - المستخدمون
```sql
id           - معرف فريد
uuid         - معرف عالمي
username     - اسم المستخدم
password_hash - كلمة السر المشفرة
email        - البريد الإلكتروني
gender       - الجنس (male/female/other)
age          - العمر
role         - الرتبة (زائر/عضو/مشرف/أدمن/مالك)
status       - الحالة (online/offline/away)
credit       - الرصيد
created_at   - تاريخ التسجيل
is_banned    - هل تم حظره
```

### جدول `messages` - الرسائل
```sql
id           - معرف فريد
message_id   - معرف عالمي للرسالة
user_id      - معرف المستخدم
room_id      - معرف الغرفة
text         - نص الرسالة
message_type - نوع الرسالة (text/image/voice)
created_at   - تاريخ الرسالة
is_edited    - هل تم تعديلها
is_deleted   - هل تم حذفها
```

### جدول `rooms` - الغرف
```sql
id           - معرف فريد
room_id      - معرف عالمي
name         - اسم الغرفة
description  - وصف الغرفة
created_by   - معرف منشئ الغرفة
created_at   - تاريخ الإنشاء
is_active    - هل الغرفة نشطة
max_users    - الحد الأقصى للمستخدمين
```

### جدول `room_sessions` - جلسات الغرف
```sql
id           - معرف فريد
user_id      - معرف المستخدم
room_id      - معرف الغرفة
socket_id    - معرف الاتصال
joined_at    - وقت الدخول
left_at      - وقت المغادرة
```

### جدول `private_messages` - الرسائل الخاصة
```sql
id           - معرف فريد
message_id   - معرف عالمي
sender_id    - معرف المرسل
receiver_id  - معرف المستقبل
text         - نص الرسالة
is_read      - هل تم قراءتها
created_at   - تاريخ الإرسال
```

### جدول `reports` - البلاغات
```sql
id           - معرف فريد
report_id    - معرف عالمي
reporter_id  - معرف المبلِّغ
message_id   - معرف الرسالة المبلغ عنها
reason       - سبب البلاغ
status       - حالة البلاغ (pending/reviewed/closed)
created_at   - تاريخ البلاغ
```

## الدوال الرئيسية في `queries.js`

### المستخدمون
```javascript
// تسجيل مستخدم جديد
await registerUser(username, password, email, gender, age);

// تسجيل الدخول
await loginUser(username, password);

// الحصول على بيانات المستخدم
await getUserById(userId);

// الحصول على مستخدمي الغرفة
await getRoomUsers(roomId);

// تحديث الرصيد
await updateUserCredit(userId, amount);
```

### الرسائل
```javascript
// إضافة رسالة
await addMessage(userId, roomId, text);

// الحصول على رسائل الغرفة
await getRoomMessages(roomId, limit, offset);

// حذف رسالة
await deleteMessage(messageId);
```

### الغرف
```javascript
// إنشاء غرفة
await createRoom(name, description, createdBy);

// الحصول على جميع الغرف
await getAllRooms();
```

### جلسات الغرف
```javascript
// إضافة جلسة
await addRoomSession(userId, roomId, socketId);

// إنهاء جلسة
await endRoomSession(userId, roomId);
```

## أمثلة الاستخدام

### التسجيل
```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "أحمد",
  "password": "password123",
  "email": "ahmed@example.com",
  "gender": "male",
  "age": 25
}
```

### تسجيل الدخول
```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "أحمد",
  "password": "password123"
}
```

### الحصول على الغرف
```bash
GET /api/rooms
```

### إنشاء غرفة جديدة
```bash
POST /api/rooms/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "غرفة البرمجة",
  "description": "لنقاش البرمجة والتطوير"
}
```

## النسخ الاحتياطية

### إنشاء نسخة احتياطية
```bash
pg_dump -U postgres -d chat_yaman -f backup_$(date +%Y%m%d_%H%M%S).sql
```

### استعادة من نسخة احتياطية
```bash
psql -U postgres -d chat_yaman -f backup_file.sql
```

## استكشاف الأخطاء

### خطأ: "Connection refused"
```bash
# تأكد من أن PostgreSQL يعمل
sudo systemctl status postgresql

# أو أعد تشغيله
sudo systemctl restart postgresql
```

### خطأ: "database does not exist"
```bash
# أنشئ قاعدة البيانات
psql -U postgres -c "CREATE DATABASE chat_yaman;"
```

### خطأ: "password authentication failed"
```bash
# تحقق من كلمة السر في .env
# أو غيّر كلمة السر في PostgreSQL
psql -U postgres
ALTER USER postgres WITH PASSWORD 'new_password';
```

## الأداء والتحسينات

- الفهارس مُنشأة للأعمدة الشائعة البحث
- اتصال pooling لتحسين الأداء
- تشفير كلمات المرور بـ bcrypt
- معرّفات عالمية (UUID) لجميع الأنواع الرئيسية

## الأمان

- كلمات المرور مشفرة بـ bcryptjs
- التحقق من التوكن JWT
- حماية من SQL Injection (مع parameterized queries)
- CORS محدود (يمكن تعديله في الإنتاج)

---

**آخر تحديث**: يوليو 2026
