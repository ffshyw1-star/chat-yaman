const jwt = require('jsonwebtoken');
const db = require('../database/queries');

// التحقق من التوكن
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'لم يتم توفير توكن' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'توكن غير صحيح' });
  }
};

// إنشاء توكن
const createToken = (userId, username, role) => {
  return jwt.sign(
    { userId, username, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// التحقق من صلاحيات الإدارة
const verifyAdmin = (req, res, next) => {
  if (req.user.role !== 'أدمن' && req.user.role !== 'مالك') {
    return res.status(403).json({ error: 'ليس لديك صلاحيات إدارية' });
  }
  next();
};

module.exports = {
  verifyToken,
  createToken,
  verifyAdmin
};