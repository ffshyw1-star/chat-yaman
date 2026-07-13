const db = require('./db-config');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// ==================== المستخدمون ====================

// تسجيل مستخدم جديد
const registerUser = async (username, password, email, gender, age) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const uuid = uuidv4();
    
    const result = await db.query(
      `INSERT INTO users (uuid, username, password_hash, email, gender, age, avatar_color)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, uuid, username, email, role, created_at`,
      [uuid, username, hashedPassword, email, gender, age, getRandomColor()]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ خطأ في التسجيل:', error);
    throw error;
  }
};

// تسجيل الدخول
const loginUser = async (username, password) => {
  try {
    const result = await db.query(
      `SELECT id, uuid, username, email, password_hash, role, status, credit, is_banned, is_verified
       FROM users WHERE username = $1`,
      [username]
    );
    
    if (result.rows.length === 0) {
      throw new Error('المستخدم غير موجود');
    }
    
    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      throw new Error('كلمة السر غير صحيحة');
    }
    
    if (user.is_banned) {
      throw new Error('تم حظر هذا الحساب');
    }
    
    // تحديث آخر تسجيل دخول
    await db.query(
      `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`,
      [user.id]
    );
    
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error('❌ خطأ في تسجيل الدخول:', error);
    throw error;
  }
};

// الحصول على بيانات المستخدم
const getUserById = async (userId) => {
  try {
    const result = await db.query(
      `SELECT id, uuid, username, email, gender, age, role, status, credit, avatar_color, created_at, is_banned, is_verified
       FROM users WHERE id = $1`,
      [userId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('❌ خطأ في الحصول على المستخدم:', error);
    throw error;
  }
};

// الحصول على جميع المستخدمين في الغرفة
const getRoomUsers = async (roomId) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT u.id, u.uuid, u.username, u.gender, u.role, u.status, u.avatar_color
       FROM users u
       INNER JOIN room_sessions rs ON u.id = rs.user_id
       WHERE rs.room_id = $1 AND rs.left_at IS NULL
       ORDER BY u.username`,
      [roomId]
    );
    return result.rows;
  } catch (error) {
    console.error('❌ خطأ في الحصول على مستخدمي الغرفة:', error);
    throw error;
  }
};

// تحديث الرصيد
const updateUserCredit = async (userId, amount) => {
  try {
    const result = await db.query(
      `UPDATE users SET credit = credit + $1 WHERE id = $2
       RETURNING credit`,
      [amount, userId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('❌ خطأ في تحديث الرصيد:', error);
    throw error;
  }
};

// ==================== الرسائل ====================

// إضافة رسالة
const addMessage = async (userId, roomId, text) => {
  try {
    const messageId = uuidv4();
    const result = await db.query(
      `INSERT INTO messages (message_id, user_id, room_id, text, message_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, message_id, created_at`,
      [messageId, userId, roomId, text, 'text']
    );
    return result.rows[0];
  } catch (error) {
    console.error('❌ خطأ في إضافة الرسالة:', error);
    throw error;
  }
};

// الحصول على رسائل الغرفة
const getRoomMessages = async (roomId, limit = 50, offset = 0) => {
  try {
    const result = await db.query(
      `SELECT m.id, m.message_id, m.text, m.created_at, m.message_type,
              u.id as user_id, u.uuid, u.username, u.gender, u.avatar_color, u.role
       FROM messages m
       INNER JOIN users u ON m.user_id = u.id
       WHERE m.room_id = $1 AND m.is_deleted = FALSE
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [roomId, limit, offset]
    );
    return result.rows.reverse();
  } catch (error) {
    console.error('❌ خطأ في الحصول على الرسائل:', error);
    throw error;
  }
};

// حذف رسالة
const deleteMessage = async (messageId) => {
  try {
    const result = await db.query(
      `UPDATE messages SET is_deleted = TRUE WHERE id = $1`,
      [messageId]
    );
    return result.rowCount > 0;
  } catch (error) {
    console.error('❌ خطأ في حذف الرسالة:', error);
    throw error;
  }
};

// ==================== الغرف ====================

// إنشاء غرفة
const createRoom = async (name, description, createdBy) => {
  try {
    const roomId = uuidv4();
    const result = await db.query(
      `INSERT INTO rooms (room_id, name, description, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, room_id, name, description, created_at`,
      [roomId, name, description, createdBy]
    );
    return result.rows[0];
  } catch (error) {
    console.error('❌ خطأ في إنشاء الغرفة:', error);
    throw error;
  }
};

// الحصول على جميع الغرف
const getAllRooms = async () => {
  try {
    const result = await db.query(
      `SELECT id, room_id, name, description, created_at, is_active,
              COUNT(rs.id) as user_count
       FROM rooms
       LEFT JOIN room_sessions rs ON rooms.id = rs.room_id AND rs.left_at IS NULL
       WHERE is_active = TRUE
       GROUP BY rooms.id
       ORDER BY rooms.name`,
      []
    );
    return result.rows;
  } catch (error) {
    console.error('❌ خطأ في الحصول على الغرف:', error);
    throw error;
  }
};

// ==================== جلسات الغرف ====================

// إضافة جلسة (المستخدم يدخل الغرفة)
const addRoomSession = async (userId, roomId, socketId) => {
  try {
    const result = await db.query(
      `INSERT INTO room_sessions (user_id, room_id, socket_id)
       VALUES ($1, $2, $3)
       RETURNING id, joined_at`,
      [userId, roomId, socketId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('❌ خطأ في إضافة الجلسة:', error);
    throw error;
  }
};

// إنهاء جلسة (المستخدم يغادر الغرفة)
const endRoomSession = async (userId, roomId) => {
  try {
    const result = await db.query(
      `UPDATE room_sessions SET left_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND room_id = $2 AND left_at IS NULL`,
      [userId, roomId]
    );
    return result.rowCount > 0;
  } catch (error) {
    console.error('❌ خطأ في إنهاء الجلسة:', error);
    throw error;
  }
};

// ==================== الرسائل الخاصة ====================

// إرسال رسالة خاصة
const sendPrivateMessage = async (senderId, receiverId, text) => {
  try {
    const messageId = uuidv4();
    const result = await db.query(
      `INSERT INTO private_messages (message_id, sender_id, receiver_id, text)
       VALUES ($1, $2, $3, $4)
       RETURNING id, message_id, created_at`,
      [messageId, senderId, receiverId, text]
    );
    return result.rows[0];
  } catch (error) {
    console.error('❌ خطأ في إرسال الرسالة الخاصة:', error);
    throw error;
  }
};

// ==================== البلاغات ====================

// إضافة بلاغ
const addReport = async (reporterId, messageId, reason) => {
  try {
    const reportId = uuidv4();
    const result = await db.query(
      `INSERT INTO reports (report_id, reporter_id, message_id, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING id, report_id, created_at`,
      [reportId, reporterId, messageId, reason]
    );
    return result.rows[0];
  } catch (error) {
    console.error('❌ خطأ في إضافة البلاغ:', error);
    throw error;
  }
};

// ==================== دوال مساعدة ====================

const getRandomColor = () => {
  const colors = ['#2196F3', '#E91E63', '#9E9E9E', '#4CAF50', '#FF9800', '#00BCD4'];
  return colors[Math.floor(Math.random() * colors.length)];
};

module.exports = {
  // Users
  registerUser,
  loginUser,
  getUserById,
  getRoomUsers,
  updateUserCredit,
  
  // Messages
  addMessage,
  getRoomMessages,
  deleteMessage,
  
  // Rooms
  createRoom,
  getAllRooms,
  
  // Room Sessions
  addRoomSession,
  endRoomSession,
  
  // Private Messages
  sendPrivateMessage,
  
  // Reports
  addReport
};