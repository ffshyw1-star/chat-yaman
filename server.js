/**
 * ============================================================
 *  خادم شات اليمن المطور — WebSocket Live Chat
 *  Node.js (CommonJS) + مكتبة ws
 * ============================================================
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const { WebSocketServer } = require('ws');

// ===== الإعدادات =====
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const ROOMS = ['global', 'yemen', 'algeria', 'egypt', 'saudi', 'morocco'];
const ROOM_LABELS = {
  global: '🌎 غرفة العامة',
  yemen: '🇾🇪 غرفة اليمن',
  algeria: '🇩🇿 غرفة الجزائر',
  egypt: '🇪🇬 غرفة مصر',
  saudi: '🇸🇦 غرفة السعودية',
  morocco: '🇲🇦 غرفة المغرب'
};
const MAX_HISTORY = 50;
const RATE_WINDOW_MS = 30_000;
const RATE_MAX = 20;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const VALID_ROLES = ['guest', 'member', 'vip', 'mod', 'admin', 'super', 'owner'];
const STATIC_FILES = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/chat-client.js': 'chat-client.js',
  '/admin.html': 'admin.html'
};

// ===== حالة في الذاكرة =====
const roomHistory = new Map();
const onlineUsers = new Map();
const sessions = new Map();

ROOMS.forEach(r => {
  roomHistory.set(r, []);
  onlineUsers.set(r, new Map());
});

setInterval(() => {
  const now = Date.now();
  for (const [token, s] of sessions) {
    if (now - s.createdAt > SESSION_TTL_MS) sessions.delete(token);
  }
}, 60 * 60 * 1000);

// ===== أدوات أساسية =====

function createSession({ name, role, country }) {
  const token = crypto.randomBytes(20).toString('hex');
  sessions.set(token, {
    userId: crypto.randomBytes(4).toString('hex'),
    name: String(name || 'زائر').slice(0, 30).trim() || 'زائر',
    role: VALID_ROLES.includes(role) ? role : 'member',
    country: String(country || '🇾🇪').slice(0, 8),
    createdAt: Date.now()
  });
  return token;
}

/** تعقيم النص لمنع XSS */
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.slice(0, 500)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}

function sendTo(ws, type, payload) {
  if (ws.readyState === 1) {
    try { ws.send(JSON.stringify({ type, payload, ts: Date.now() })); }
    catch (e) { /* ignore */ }
  }
}

function broadcast(room, type, payload, exceptUserId = null) {
  const users = onlineUsers.get(room);
  if (!users) return;
  const data = JSON.stringify({ type, room, payload, ts: Date.now() });
  for (const [id, info] of users) {
    if (id !== exceptUserId && info.ws.readyState === 1) {
      try { info.ws.send(data); } catch (e) { /* ignore */ }
    }
  }
}

function getOnlineList(room) {
  const users = onlineUsers.get(room);
  return Array.from(users.values()).map(u => ({
    userId: u.userId, name: u.name, role: u.role, country: u.country
  }));
}

function addToHistory(room, message) {
  const history = roomHistory.get(room);
  history.push(message);
  if (history.length > MAX_HISTORY) history.shift();
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

// ===== خادم HTTP =====
const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS); return res.end();
  }

  // POST /api/login
  if (req.method === 'POST' && parsed.pathname === '/api/login') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2048) {
        req.destroy();
        res.writeHead(413, CORS); res.end('Too large');
      }
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const token = createSession({
          name: data.name, role: data.role, country: data.country
        });
        const s = sessions.get(token);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', ...CORS });
        res.end(JSON.stringify({
          ok: true, token, userId: s.userId,
          name: s.name, role: s.role, country: s.country,
          rooms: ROOMS, labels: ROOM_LABELS
        }));
      } catch (e) {
        res.writeHead(400, CORS); res.end(JSON.stringify({ ok: false, error: 'bad_json' }));
      }
    });
    return;
  }

  // GET /api/health
  if (req.method === 'GET' && parsed.pathname === '/api/health') {
    const stats = {
      ok: true,
      uptime: process.uptime(),
      totalOnline: Array.from(onlineUsers.values()).reduce((sum, m) => sum + m.size, 0),
      rooms: ROOMS.map(r => ({ id: r, label: ROOM_LABELS[r], online: onlineUsers.get(r).size })),
      sessions: sessions.size,
      memory: process.memoryUsage()
    };
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', ...CORS });
    res.end(JSON.stringify(stats));
    return;
  }

  // الملفات الثابتة
  if (req.method === 'GET' && STATIC_FILES[parsed.pathname]) {
    const filePath = path.join(__dirname, 'public', STATIC_FILES[parsed.pathname]);
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8'
    }[ext] || 'application/octet-stream';
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
      res.end(data);
    });
    return;
  }

  res.writeHead(404, CORS); res.end('Not found');
});

// ===== خادم WebSocket =====
const wss = new WebSocketServer({ server, maxPayload: 4096 });

wss.on('connection', (ws, req) => {
  const parsed = new URL(req.url, `http://${req.headers.host}`);
  const token = parsed.searchParams.get('token');
  const session = token && sessions.get(token);

  if (!session) {
    sendTo(ws, 'error', { code: 'AUTH_REQUIRED', message: 'يجب تسجيل الدخول أولاً' });
    setTimeout(() => ws.close(4001, 'Unauthorized'), 100);
    return;
  }

  ws.userId = session.userId;
  ws.userName = session.name;
  ws.userRole = session.role;
  ws.userCountry = session.country;
  ws.currentRoom = null;
  ws.rateBuckets = [];
  ws.isAlive = true;
  ws.joinedAt = Date.now();

  sendTo(ws, 'auth_ok', {
    userId: ws.userId, name: ws.userName,
    role: ws.userRole, country: ws.userCountry,
    rooms: ROOMS, labels: ROOM_LABELS
  });

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', raw => {
    if (raw.length > 4096) {
      sendTo(ws, 'error', { message: 'الرسالة كبيرة جداً' });
      return;
    }
    let msg;
    try { msg = JSON.parse(raw.toString()); }
    catch {
      sendTo(ws, 'error', { code: 'BAD_JSON', message: 'بيانات غير صالحة' });
      return;
    }
    if (!msg || typeof msg.type !== 'string') {
      sendTo(ws, 'error', { message: 'نوع الرسالة مفقود' });
      return;
    }
    handleMessage(ws, msg);
  });

  ws.on('close', () => {
    if (ws.currentRoom && onlineUsers.has(ws.currentRoom)) {
      const users = onlineUsers.get(ws.currentRoom);
      if (users.delete(ws.userId)) {
        broadcast(ws.currentRoom, 'user_left', { userId: ws.userId, name: ws.userName });
        broadcast(ws.currentRoom, 'online', {
          users: getOnlineList(ws.currentRoom), count: users.size
        });
      }
    }
  });

  ws.on('error', err => {
    console.error(`⚠️ خطأ في اتصال ${ws.userName}:`, err.message);
  });
});

function handleMessage(ws, msg) {
  switch (msg.type) {

    case 'join_room': {
      const room = ROOMS.includes(msg.room) ? msg.room : 'global';

      if (ws.currentRoom && onlineUsers.has(ws.currentRoom)) {
        const prev = onlineUsers.get(ws.currentRoom);
        if (prev.delete(ws.userId)) {
          broadcast(ws.currentRoom, 'user_left', { userId: ws.userId, name: ws.userName });
          broadcast(ws.currentRoom, 'online', {
            users: getOnlineList(ws.currentRoom), count: prev.size
          });
        }
      }

      ws.currentRoom = room;
      const users = onlineUsers.get(room);
      users.set(ws.userId, {
        ws, userId: ws.userId,
        name: ws.userName, role: ws.userRole, country: ws.userCountry
      });

      const onlineArr = getOnlineList(room);
      sendTo(ws, 'room_joined', {
        room, label: ROOM_LABELS[room],
        history: roomHistory.get(room),
        online: onlineArr, count: users.size
      });

      broadcast(room, 'user_joined', {
        userId: ws.userId, name: ws.userName,
        role: ws.userRole, country: ws.userCountry
      }, ws.userId);

      broadcast(room, 'online', { users: onlineArr, count: users.size });
      break;
    }

    case 'send_message': {
      if (!ws.currentRoom) {
        return sendTo(ws, 'error', { message: 'انضم لغرفة أولاً' });
      }

      const now = Date.now();
      ws.rateBuckets = ws.rateBuckets.filter(t => now - t < RATE_WINDOW_MS);
      if (ws.rateBuckets.length >= RATE_MAX) {
        return sendTo(ws, 'error', {
          code: 'RATE_LIMIT',
          message: 'تجاوزت حد الرسائل المسموح، حاول بعد ' +
                   Math.ceil(RATE_WINDOW_MS / 1000) + ' ثانية'
        });
      }

      const text = sanitize(msg.text || '');
      if (!text.trim()) {
        return sendTo(ws, 'error', { message: 'الرسالة فارغة' });
      }

      ws.rateBuckets.push(now);

      const message = {
        id: crypto.randomBytes(8).toString('hex'),
        userId: ws.userId, name: ws.userName,
        role: ws.userRole, country: ws.userCountry,
        text,
        time: new Date().toLocaleTimeString('ar-EG', {
          hour: '2-digit', minute: '2-digit', hour12: false
        }),
        date: new Date().toLocaleDateString('ar-EG'),
        ts: now
      };

      addToHistory(ws.currentRoom, message);
      broadcast(ws.currentRoom, 'message', message);
      break;
    }

    case 'typing': {
      if (!ws.currentRoom) return;
      broadcast(ws.currentRoom, 'typing', {
        userId: ws.userId, name: ws.userName, isTyping: !!msg.isTyping
      }, ws.userId);
      break;
    }

    case 'private_message': {
      const targetId = msg.targetUserId;
      const targetRoom = msg.targetRoom || ws.currentRoom;
      if (!targetId || !onlineUsers.has(targetRoom)) return;
      const users = onlineUsers.get(targetRoom);
      const target = users.get(targetId);
      if (!target) return sendTo(ws, 'error', { message: 'المستلم غير متصل' });
      const text = sanitize(msg.text || '');
      if (!text.trim()) return;
      const pm = {
        id: crypto.randomBytes(8).toString('hex'),
        from: { userId: ws.userId, name: ws.userName, country: ws.userCountry },
        text,
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false }),
        ts: Date.now()
      };
      sendTo(target.ws, 'private_message', pm);
      sendTo(ws, 'private_sent', pm);
      break;
    }

    case 'ping':
      sendTo(ws, 'pong', { ts: Date.now() });
      break;

    default:
      sendTo(ws, 'error', { message: 'نوع رسالة غير معروف: ' + msg.type });
  }
}

// Heartbeat — قتل الاتصالات الميتة
const heartbeat = setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) {
      try { ws.terminate(); } catch (e) {}
      return;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch (e) {}
  });
}, 30_000);

wss.on('close', () => clearInterval(heartbeat));

// ===== بدء التشغيل =====
server.listen(PORT, HOST, () => {
  console.log('=========================================');
  console.log('🇾🇪  خادم شات اليمن المطور');
  console.log('=========================================');
  console.log('✅ يعمل على:  http://localhost:' + PORT);
  console.log('📡 WebSocket: ws://localhost:' + PORT + '/?token=...');
  console.log('🌍 الغرف:    ' + ROOMS.join(', '));
  console.log('💚 الحالة:  جاهز لاستقبال الاتصالات');
  console.log('=========================================');
});

function shutdown() {
  console.log('\n🛑 إيقاف الخادم...');
  wss.clients.forEach(ws => { try { ws.close(1001); } catch (e) {} });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
