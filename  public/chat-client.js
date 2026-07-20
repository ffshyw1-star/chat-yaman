/**
 * ============================================================
 *  عميل WebSocket لشات اليمن المطور
 *  يُعرّف window.YemenChat للأحداث + الربط التلقائي بالـ DOM
 * ============================================================
 */
(function () {
  'use strict';

  const YemenChat = {
    socket: null,
    token: null,
    user: null,
    currentRoom: null,
    reconnectAttempts: 0,
    maxReconnect: 10,
    listeners: {},
    typingState: {},
    _stopTypingTimers: {},
    status: 'idle',

    on(event, handler) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(handler);
      return () => {
        this.listeners[event] = (this.listeners[event] || [])
          .filter(h => h !== handler);
      };
    },

    emit(event, payload) {
      (this.listeners[event] || []).forEach(h => {
        try { h(payload); } catch (e) { console.error(e); }
      });
    },

    async login(name, role = 'member', country = '🇾🇪') {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, country })
      });
      if (!res.ok) throw new Error('Login failed: ' + res.status);
      const data = await res.json();
      if (!data.ok) throw new Error('Server rejected login');

      this.token = data.token;
      this.user = {
        userId: data.userId, name: data.name,
        role: data.role, country: data.country
      };
      try { localStorage.setItem('yemen_chat_token', this.token); } catch (e) {}
      this.openSocket();
      return data;
    },

    resume() {
      try {
        const token = localStorage.getItem('yemen_chat_token');
        if (token) { this.token = token; this.openSocket(); return true; }
      } catch (e) {}
      return false;
    },

    openSocket() {
      if (this.socket && this.socket.readyState <= 1) return;
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const url = `${proto}://${location.host}/?token=${this.token}`;

      this.setStatus('connecting');
      this.socket = new WebSocket(url);

      this.socket.addEventListener('open', () => {
        this.reconnectAttempts = 0;
        this.setStatus('connected');
      });

      this.socket.addEventListener('message', e => {
        try {
          const msg = JSON.parse(e.data);
          this.handle(msg);
        } catch (err) { console.error('🚫 رسالة تالفة:', err); }
      });

      this.socket.addEventListener('close', e => {
        this.setStatus('disconnected');
        if (e.code === 4001) {
          this.token = null;
          try { localStorage.removeItem('yemen_chat_token'); } catch (err) {}
          this.emit('error', { message: 'انتهت الجلسة، يرجى إعادة الدخول' });
          return;
        }
        if (this.token && this.reconnectAttempts < this.maxReconnect) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(1.6, this.reconnectAttempts), 30000);
          this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });
          setTimeout(() => this.openSocket(), delay);
        }
      });

      this.socket.addEventListener('error', e => {
        this.emit('error', { message: 'خطأ في الاتصال بالخادم' });
      });
    },

    setStatus(s) {
      this.status = s;
      this.emit('status', s);
    },

    handle(msg) {
      const handlers = {
        auth_ok: () => {
          this.user = msg.payload;
          this.emit('auth', msg.payload);
        },
        room_joined: () => {
          this.currentRoom = msg.payload.room;
          this.emit('room_joined', msg.payload);
        },
        message: () => this.emit('message', msg.payload),
        typing: () => {
          const t = msg.payload;
          if (t.isTyping) {
            this.typingState[t.userId] = t.name;
            clearTimeout(this._stopTypingTimers[t.userId]);
            this._stopTypingTimers[t.userId] = setTimeout(() => {
              delete this.typingState[t.userId];
              this.emit('typing', this.getTypingList());
            }, 5000);
          } else {
            delete this.typingState[t.userId];
          }
          this.emit('typing', this.getTypingList());
        },
        online: () => this.emit('online', msg.payload),
        user_joined: () => this.emit('user_joined', msg.payload),
        user_left: () => this.emit('user_left', msg.payload),
        private_message: () => {
          this.emit('private_message', msg.payload);
          this.emit('notification', { type: 'pm', data: msg.payload });
        },
        pong: () => {},
        error: () => this.emit('error', msg.payload)
      };
      const h = handlers[msg.type];
      if (h) h();
    },

    getTypingList() {
      return Object.values(this.typingState || {});
    },

    _send(type, payload) {
      if (!this.socket || this.socket.readyState !== 1) {
        this.emit('error', { message: 'غير متصل بالخادم' });
        return false;
      }
      try {
        this.socket.send(JSON.stringify({ type, ...payload }));
        return true;
      } catch (e) { return false; }
    },

    joinRoom(room) { this._send('join_room', { room }); },
    sendMessage(text) { return this._send('send_message', { text }); },
    sendPrivate(targetUserId, text, fromRoom) {
      return this._send('private_message', {
        targetUserId, text,
        targetRoom: fromRoom || this.currentRoom
      });
    },
    typing(isTyping) { this._send('typing', { isTyping }); },

    disconnect() {
      this.token = null;
      try { localStorage.removeItem('yemen_chat_token'); } catch (e) {}
      if (this.socket) {
        try { this.socket.close(1000); } catch (e) {}
      }
    }
  };

  window.YemenChat = YemenChat;

  // ربط تلقائي بالـ DOM
  if (typeof document !== 'undefined') {

    YemenChat.on('message', m => {
      const c = document.getElementById('messages');
      if (!c) return;
      const el = document.createElement('div');
      el.className = 'msg';
      el.dataset.id = m.id || '';
      const roleBadge = {
        owner: '👑', super: '⭐', admin: '☆',
        mod: '🛡️', vip: '💎', member: '', guest: ''
      }[m.role] || '';
      el.innerHTML = `
        <div class="msg-avatar">${(m.name || '?')[0]}</div>
        <div class="msg-content">
          <div class="msg-head">
            <span class="msg-name">${m.name} ${m.country || ''} ${roleBadge}</span>
            <span class="msg-time">${m.time || ''}</span>
          </div>
          <div class="msg-text">${m.text}</div>
        </div>
      `;
      c.appendChild(el);
      c.scrollTop = c.scrollHeight;
    });

    YemenChat.on('online', payload => {
      const c = document.getElementById('onlineList');
      if (!c) return;
      const users = (payload && payload.users) || payload || [];
      if (!Array.isArray(users)) return;
      c.innerHTML = '';
      const roleOrder = ['owner','super','admin','mod','vip','member','guest'];
      users.sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role));
      users.forEach(u => {
        const row = document.createElement('div');
        row.className = 'online-row';
        row.dataset.userId = u.userId;
        const roleIcons = { owner:'👑', super:'⭐', admin:'☆', mod:'🛡️', vip:'💎' };
        row.innerHTML = `
          <div class="av">${(u.name||'?')[0]}<span class="dot"></span></div>
          <div class="nm">${u.name}</div>
          <div class="r">${roleIcons[u.role] || u.country || ''}</div>
        `;
        c.appendChild(row);
      });
      const countEl = document.getElementById('onlineCount');
      if (countEl) countEl.textContent = users.length;
    });

    YemenChat.on('typing', names => {
      const el = document.getElementById('typingIndicator');
      if (!el) return;
      if (!names || names.length === 0) {
        el.style.display = 'none';
        el.textContent = '';
      } else {
        el.style.display = 'block';
        el.textContent = names.slice(0, 3).join('، ') +
          (names.length > 3 ? '...' : '') + ' يكتب...';
      }
    });

    YemenChat.on('room_joined', p => {
      const t = document.getElementById('roomTitle');
      if (t) t.textContent = p.label || p.room;
      const c = document.getElementById('messages');
      if (c && p.history) {
        c.innerHTML = '';
        p.history.forEach(m => YemenChat.emit('message', m));
      }
      document.querySelectorAll('#roomTabs button').forEach(b => {
        b.classList.toggle('active', b.dataset.room === p.room);
      });
    });

    YemenChat.on('status', s => {
      const el = document.getElementById('chatStatus');
      if (!el) return;
      el.classList.remove('ok', 'bad', 'connecting');
      if (s === 'connected') {
        el.textContent = '🟢 متصل';
        el.classList.add('ok');
      } else if (s === 'connecting') {
        el.textContent = '🟡 جاري الاتصال...';
        el.classList.add('connecting');
      } else {
        el.textContent = '🔴 غير متصل';
        el.classList.add('bad');
      }
    });

    YemenChat.on('error', e => {
      console.warn('⚠️', e);
      const el = document.getElementById('chatStatus');
      if (el && YemenChat.status === 'disconnected') {
        el.textContent = '⚠️ ' + (e.message || 'خطأ');
      }
    });

    YemenChat.on('private_message', pm => {
      const badge = document.getElementById('pmBadge');
      if (badge) {
        const c = parseInt(badge.textContent || '0', 10) + 1;
        badge.textContent = c;
        badge.style.display = 'inline';
      }
    });

    document.addEventListener('DOMContentLoaded', () => {
      const inp = document.getElementById('msgInput');
      if (!inp) return;
      let lastSent = false;
      inp.addEventListener('input', () => {
        if (!lastSent) { YemenChat.typing(true); lastSent = true; }
        clearTimeout(YemenChat._stopInputTimer);
        YemenChat._stopInputTimer = setTimeout(() => {
          YemenChat.typing(false); lastSent = false;
        }, 1500);
      });
      document.querySelectorAll('#roomTabs button').forEach(btn => {
        btn.addEventListener('click', () => YemenChat.joinRoom(btn.dataset.room));
      });
    });
  }

  window.YEMEN_ROOMS = {
    global: '🌎 غرفة العامة',
    yemen: '🇾🇪 غرفة اليمن',
    algeria: '🇩🇿 غرفة الجزائر',
    egypt: '🇪🇬 غرفة مصر',
    saudi: '🇸🇦 غرفة السعودية',
    morocco: '🇲🇦 غرفة المغرب'
  };
})();
