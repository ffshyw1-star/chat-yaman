const express = require('express');
const adminQueries = require('./admin-queries');
const { verifyToken, verifyAdmin } = require('./auth-middleware');

const router = express.Router();

// ==================== لوحة التحكم - الإحصائيات ====================

// الحصول على الإحصائيات العامة
router.get('/dashboard/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const stats = await adminQueries.getDashboardStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// الحصول على رسم بياني للأنشطة
router.get('/dashboard/activity-chart', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const days = req.query.days || 7;
    const chart = await adminQueries.getActivityChart(days);
    res.json(chart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== إدارة المستخدمين ====================

// الحصول على جميع المستخدمين
router.get('/users', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const users = await adminQueries.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// البحث عن مستخدمين
router.get('/users/search', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query) {
      return res.status(400).json({ error: 'يجب إدخال كلمة بحث' });
    }
    
    const users = await adminQueries.searchUsers(query);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// تغيير دور المستخدم
router.put('/users/:userId/role', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    if (!role) {
      return res.status(400).json({ error: 'الرتبة مطلوبة' });
    }
    
    const user = await adminQueries.changeUserRole(userId, role);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// حظر المستخدم
router.put('/users/:userId/ban', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isBanned } = req.body;
    
    const user = await adminQueries.banUser(userId, isBanned);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// إضافة رصيد للمستخدم
router.post('/users/:userId/credit', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, reason } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'المبلغ يجب أن يكون موجباً' });
    }
    
    const user = await adminQueries.addUserCredit(userId, amount, reason || 'هدية من الإدارة');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// حذف المستخدم
router.delete('/users/:userId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // منع حذف الملك
    if (userId === req.user.userId) {
      return res.status(403).json({ error: 'لا يمكنك حذف حسابك' });
    }
    
    const user = await adminQueries.deleteUser(userId);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== إدارة الغرف ====================

// الحصول على جميع الغرف
router.get('/rooms', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const rooms = await adminQueries.getAllRoomsWithStats();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// تفعيل/تعطيل الغرفة
router.put('/rooms/:roomId/status', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { isActive } = req.body;
    
    const room = await adminQueries.toggleRoomStatus(roomId, isActive);
    res.json({ success: true, room });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// تحديث الغرفة
router.put('/rooms/:roomId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'اسم الغرفة مطلوب' });
    }
    
    const room = await adminQueries.updateRoom(roomId, name, description);
    res.json({ success: true, room });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// حذف الغرفة
router.delete('/rooms/:roomId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await adminQueries.deleteRoom(roomId);
    res.json({ success: true, room });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== إدارة الرسائل والبلاغات ====================

// الحصول على الرسائل المُبلّغ عنها
router.get('/reports', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const reports = await adminQueries.getReportedMessages();
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// معالجة البلاغ
router.post('/reports/:reportId/handle', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, action } = req.body;
    
    const result = await adminQueries.handleReport(
      reportId,
      status,
      req.user.userId,
      action
    );
    
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// حذف رسالة
router.delete('/messages/:messageId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await adminQueries.deleteMessage(messageId);
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== السجلات ====================

// الحصول على سجل النشاطات
router.get('/logs/activity', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const logs = await adminQueries.getActivityLogs(limit, offset);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;