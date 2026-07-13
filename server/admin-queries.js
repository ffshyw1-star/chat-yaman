const db = require('../database/queries');

// ==================== إدارة المستخدمين ====================

// الحصول على جميع المستخدمين
const getAllUsers = async () => {
  try {
    const result = await db.query(
      `SELECT id, uuid, username, email, gender, age, role, status, credit, created_at, is_banned, is_verified
       FROM users
       ORDER BY created_at DESC`,
      []
    );
    return result.rows;
  } catch (error) {
    console.error('❌ خطأ في الحصول على المستخدمين:', error);
    throw error;
  }
};

// البحث عن مستخدم
const searchUsers = async (query) => {
  try {
    const result = await db.query(
      `SELECT id, uuid, username, email, gender, age, role, status, credit, created_at, is_banned
       FROM users
       WHERE username ILIKE $1 OR email ILIKE $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [`%${query}%`]
    );
    return result.rows;
  } catch (error) {
    console.error('❌ خطأ في البحث:', error);
    throw error;
  }
};

// تغيير دور المستخدم
const changeUserRole = async (userId, newRole) => {
  try {
    const roles = ['زائر', 'عضو', 'مميز', 'مشرف', 'إدارة', 'أدمن', 'مالك'];
    
    if (!roles.includes(newRole)) {
      throw new Error('رتبة غير صحيحة');
    }
    
    const result = await db.query(
      `UPDATE users SET role = $1 WHERE id = $2
       RETURNING id, username, role`,
      [newRole, userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('المستخدم غير موجود');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ خطأ في تغيير الدور:', error);
    throw error;
  }
};

// حظر/فك حظر المستخدم
const banUser = async (userId, isBanned) => {
  try {
    const result = await db.query(
      `UPDATE users SET is_banned = $1 WHERE id = $2
       RETURNING id, username, is_banned`,
      [isBanned, userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('المستخدم غير موجود');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ خطأ في حظر المستخدم:', error);
    throw error;
  }
};

// إضافة رصيد للمستخدم
const addUserCredit = async (userId, amount, reason) => {
  try {
    const result = await db.query(
      `UPDATE users SET credit = credit + $1 WHERE id = $2
       RETURNING id, username, credit`,
      [amount, userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('المستخدم غير موجود');
    }
    
    // تسجيل في السجلات
    await db.query(
      `INSERT INTO activity_logs (user_id, action, details)
       VALUES ($1, $2, $3)`,
      [userId, 'add_credit', `أضيف رصيد: ${amount} - ${reason}`]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ خطأ في إضافة الرصيد:', error);
    throw error;
  }
};

// حذف المستخدم
const deleteUser = async (userId) => {
  try {
    const result = await db.query(
      `DELETE FROM users WHERE id = $1
       RETURNING id, username`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('المستخدم غير موجود');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ خطأ في حذف المستخدم:', error);
    throw error;
  }
};

// ==================== إدارة الغرف ====================

// الحصول على جميع الغرف مع إحصائيات
const getAllRoomsWithStats = async () => {
  try {
    const result = await db.query(
      `SELECT 
        r.id, r.room_id, r.name, r.description, r.created_at, r.is_active,
        COUNT(DISTINCT rs.user_id) as active_users,
        COUNT(DISTINCT m.id) as total_messages,
        u.username as created_by_name
       FROM rooms r
       LEFT JOIN room_sessions rs ON r.id = rs.room_id AND rs.left_at IS NULL
       LEFT JOIN messages m ON r.id = m.room_id
       LEFT JOIN users u ON r.created_by = u.id
       GROUP BY r.id, u.username
       ORDER BY r.created_at DESC`,
      []
    );
    return result.rows;
  } catch (error) {
    console.error('❌ خطأ في الحصول على الغرف:', error);
    throw error;
  }
};

// تعطيل/تفعيل غرفة
const toggleRoomStatus = async (roomId, isActive) => {
  try {
    const result = await db.query(
      `UPDATE rooms SET is_active = $1 WHERE id = $2
       RETURNING id, name, is_active`,
      [isActive, roomId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('الغرفة غير موجودة');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ خطأ في تغيير حالة الغرفة:', error);
    throw error;
  }
};

// حذف الغرفة
const deleteRoom = async (roomId) => {
  try {
    const result = await db.query(
      `DELETE FROM rooms WHERE id = $1
       RETURNING id, name`,
      [roomId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('الغرفة غير موجودة');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ خطأ في حذف الغرفة:', error);
    throw error;
  }
};

// تحديث معلومات الغرفة
const updateRoom = async (roomId, name, description) => {
  try {
    const result = await db.query(
      `UPDATE rooms SET name = $1, description = $2 WHERE id = $3
       RETURNING id, name, description, created_at`,
      [name, description, roomId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('الغرفة غير موجودة');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ خطأ في تحديث الغرفة:', error);
    throw error;
  }
};

// ==================== إدارة الرسائل ====================

// الحصول على الرسائل المُبلّغ عنها
const getReportedMessages = async () => {
  try {
    const result = await db.query(
      `SELECT 
        r.id, r.report_id, r.reason, r.status, r.created_at,
        m.text as message_text, m.created_at as message_date,
        u.username as reporter_username,
        mu.username as message_author
       FROM reports r
       INNER JOIN messages m ON r.message_id = m.id
       INNER JOIN users u ON r.reporter_id = u.id
       INNER JOIN users mu ON m.user_id = mu.id
       WHERE r.status = 'pending'
       ORDER BY r.created_at DESC`,
      []
    );
    return result.rows;
  } catch (error) {
    console.error('❌ خطأ في الحصول على البلاغات:', error);
    throw error;
  }
};

// معالجة البلاغ
const handleReport = async (reportId, status, adminId, action) => {
  try {
    // تحديث حالة البلاغ
    let result = await db.query(
      `UPDATE reports SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, message_id`,
      [status, adminId, reportId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('البلاغ غير موجود');
    }
    
    const messageId = result.rows[0].message_id;
    
    // تنفيذ الإجراء
    if (action === 'delete_message') {
      await db.query(
        `UPDATE messages SET is_deleted = TRUE WHERE id = $1`,
        [messageId]
      );
    } else if (action === 'warn_user') {
      const message = await db.query(
        `SELECT user_id FROM messages WHERE id = $1`,
        [messageId]
      );
      
      if (message.rows.length > 0) {
        const userId = message.rows[0].user_id;
        await db.query(
          `INSERT INTO activity_logs (user_id, action, details)
           VALUES ($1, $2, $3)`,
          [userId, 'warning', 'تم إصدار تحذير بسبب رسالة مخالفة']
        );
      }
    } else if (action === 'ban_user') {
      const message = await db.query(
        `SELECT user_id FROM messages WHERE id = $1`,
        [messageId]
      );
      
      if (message.rows.length > 0) {
        const userId = message.rows[0].user_id;
        await banUser(userId, true);
      }
    }
    
    return { success: true, reportId, action };
  } catch (error) {
    console.error('❌ خطأ في معالجة البلاغ:', error);
    throw error;
  }
};

// حذف رسالة
const deleteMessage = async (messageId) => {
  try {
    const result = await db.query(
      `UPDATE messages SET is_deleted = TRUE WHERE id = $1
       RETURNING id, user_id`,
      [messageId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('الرسالة غير موجودة');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ خطأ في حذف الرسالة:', error);
    throw error;
  }
};

// ==================== الإحصائيات ====================

// إحصائيات عامة
const getDashboardStats = async () => {
  try {
    const stats = {};
    
    // عدد المستخدمين
    let result = await db.query(`SELECT COUNT(*) as count FROM users`);
    stats.totalUsers = parseInt(result.rows[0].count);
    
    // المستخدمون المتصلون
    result = await db.query(
      `SELECT COUNT(DISTINCT user_id) as count FROM room_sessions WHERE left_at IS NULL`
    );
    stats.onlineUsers = parseInt(result.rows[0].count);
    
    // عدد الغرف
    result = await db.query(`SELECT COUNT(*) as count FROM rooms WHERE is_active = TRUE`);
    stats.activeRooms = parseInt(result.rows[0].count);
    
    // عدد الرسائل
    result = await db.query(`SELECT COUNT(*) as count FROM messages WHERE is_deleted = FALSE`);
    stats.totalMessages = parseInt(result.rows[0].count);
    
    // البلاغات المعلقة
    result = await db.query(`SELECT COUNT(*) as count FROM reports WHERE status = 'pending'`);
    stats.pendingReports = parseInt(result.rows[0].count);
    
    // المستخدمون المحظورون
    result = await db.query(`SELECT COUNT(*) as count FROM users WHERE is_banned = TRUE`);
    stats.bannedUsers = parseInt(result.rows[0].count);
    
    // المستخدمون الجدد (آخر 7 أيام)
    result = await db.query(
      `SELECT COUNT(*) as count FROM users WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'`
    );
    stats.newUsersThisWeek = parseInt(result.rows[0].count);
    
    // الرسائل اليوم
    result = await db.query(
      `SELECT COUNT(*) as count FROM messages WHERE DATE(created_at) = CURRENT_DATE`
    );
    stats.messagestoday = parseInt(result.rows[0].count);
    
    return stats;
  } catch (error) {
    console.error('❌ خطأ في الحصول على الإحصائيات:', error);
    throw error;
  }
};

// إحصائيات الأنشطة
const getActivityChart = async (days = 7) => {
  try {
    const result = await db.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as messages,
        COUNT(DISTINCT user_id) as unique_users
       FROM messages
       WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      []
    );
    return result.rows;
  } catch (error) {
    console.error('❌ خطأ في الحصول على الرسم البياني:', error);
    throw error;
  }
};

// ==================== سجل النشاطات ====================

// الحصول على سجل النشاطات
const getActivityLogs = async (limit = 100, offset = 0) => {
  try {
    const result = await db.query(
      `SELECT 
        al.id, al.action, al.details, al.created_at, al.ip_address,
        u.username
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  } catch (error) {
    console.error('❌ خطأ في الحصول على السجلات:', error);
    throw error;
  }
};

// ==================== النسخ الاحتياطية ====================

// تسجيل النسخة الاحتياطية
const logBackup = async (backupSize, status) => {
  try {
    await db.query(
      `INSERT INTO activity_logs (action, details)
       VALUES ($1, $2)`,
      ['backup', `حجم النسخة: ${backupSize} - الحالة: ${status}`]
    );
  } catch (error) {
    console.error('❌ خطأ في تسجيل النسخة الاحتياطية:', error);
  }
};

module.exports = {
  // User Management
  getAllUsers,
  searchUsers,
  changeUserRole,
  banUser,
  addUserCredit,
  deleteUser,
  
  // Room Management
  getAllRoomsWithStats,
  toggleRoomStatus,
  deleteRoom,
  updateRoom,
  
  // Message Management
  getReportedMessages,
  handleReport,
  deleteMessage,
  
  // Statistics
  getDashboardStats,
  getActivityChart,
  
  // Activity Logs
  getActivityLogs,
  logBackup
};