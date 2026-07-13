// متغيرات عامة
let currentUser = null;
let currentRoom = 'عام';
let userGender = 'other';
let regGender = 'other';
let users = [];
let messages = [];

// ألوان الأجنحة
const genderColors = {
  male: '#2196F3',
  female: '#E91E63',
  other: '#9E9E9E'
};

const genderEmoji = {
  male: '♂️',
  female: '♀️',
  other: '⚪'
};

// فتح/إغلاق النوافذ المنبثقة
function openPopup(type) {
  document.getElementById(type + 'Popup').classList.add('show');
}

function closePopup(type) {
  document.getElementById(type + 'Popup').classList.remove('show');
}

// اختيار الجنس
function toggleGender(type) {
  const optionsId = type === 'reg' ? 'regGenderOptions' : (type === 'guest' ? 'guestGenderOptions' : '');
  const options = document.getElementById(optionsId);
  options.classList.toggle('show');
}

function setGender(type, gender) {
  userGender = gender;
  const btnId = type === 'guest' ? 'guestGenderBtn' : '';
  const btn = document.getElementById(btnId);
  const text = gender === 'male' ? '♂️ ذكر' : (gender === 'female' ? '♀️ انثى' : '⚪ آخر');
  if (btn) btn.textContent = text;
  document.getElementById(type + 'GenderOptions').classList.remove('show');
}

function setRegGender(gender) {
  regGender = gender;
  const btn = document.getElementById('regGenderBtn');
  const text = gender === 'male' ? '♂️ ذكر' : (gender === 'female' ? '♀️ انثى' : '⚪ آخر');
  btn.textContent = text;
  document.getElementById('regGenderOptions').classList.remove('show');
}

// دخول الزائر
function guestLogin() {
  const name = document.getElementById('guestName').value.trim();
  if (!name) {
    alert('الرجاء إدخال اسم المستخدم');
    return;
  }
  
  currentUser = {
    id: Math.random().toString(36).substr(2, 9),
    name: name,
    role: 'زائر',
    gender: userGender,
    avatar: getAvatar(name, userGender),
    joinTime: new Date()
  };
  
  closePopup('guest');
  showRoomsList();
}

// دخول العضو
function memberLogin() {
  const name = document.getElementById('loginName').value.trim();
  const pass = document.getElementById('loginPass').value.trim();
  
  if (!name || !pass) {
    alert('الرجاء ملء البيانات');
    return;
  }
  
  // تحقق من البيانات (في التطبيق الفعلي تكون من الخادم)
  currentUser = {
    id: Math.random().toString(36).substr(2, 9),
    name: name,
    role: 'عضو',
    gender: 'other',
    avatar: getAvatar(name, 'other'),
    joinTime: new Date()
  };
  
  closePopup('login');
  showRoomsList();
}

// التسجيل
function register() {
  const name = document.getElementById('regName').value.trim();
  const pass = document.getElementById('regPass').value.trim();
  const pass2 = document.getElementById('regPass2').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const age = document.getElementById('regAge').value;
  
  if (!name || !pass || !pass2) {
    alert('الرجاء ملء البيانات المطلوبة');
    return;
  }
  
  if (pass !== pass2) {
    alert('كلمات المرور غير متطابقة');
    return;
  }
  
  currentUser = {
    id: Math.random().toString(36).substr(2, 9),
    name: name,
    role: 'عضو',
    gender: regGender,
    email: email,
    age: age,
    avatar: getAvatar(name, regGender),
    joinTime: new Date()
  };
  
  closePopup('register');
  showRoomsList();
}

// عرض قائمة الغرف
function showRoomsList() {
  document.getElementById('mainMenu').style.display = 'none';
  document.getElementById('roomsList').classList.add('show');
}

// الدخول للغرفة
function joinRoom(room) {
  currentRoom = room;
  document.getElementById('roomsList').classList.remove('show');
  document.getElementById('chatArea').style.display = 'flex';
  document.getElementById('currentRoom').textContent = 'شات اليمن المطور - ' + room;
  
  // إضافة رسالة ترحيب
  addSystemMessage(`[ ${currentUser.name} انضم للغرفة ${room} - أهلاً وسهلاً ]`);
  loadMessages();
}

// إرسال الرسالة
function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  
  if (!text) return;
  
  const message = {
    id: Math.random().toString(36).substr(2, 9),
    user: currentUser,
    text: text,
    time: new Date(),
    room: currentRoom
  };
  
  messages.push(message);
  displayMessage(message);
  input.value = '';
  
  // في التطبيق الفعلي، إرسل للخادم
  sendToServer(message);
}

// معالجة Enter
function handleKeyPress(event) {
  if (event.key === 'Enter') {
    sendMessage();
  }
}

// عرض الرسالة
function displayMessage(msg) {
  const messagesDiv = document.getElementById('messages');
  const msgElement = document.createElement('div');
  msgElement.className = 'msg';
  
  const color = genderColors[msg.user.gender] || genderColors.other;
  const emoji = genderEmoji[msg.user.gender] || genderEmoji.other;
  
  const time = msg.time.toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }) + ' ' + 
               msg.time.toLocaleDateString('ar-YE', { day: '2-digit', month: '2-digit' });
  
  msgElement.innerHTML = `
    <div class="msg-avatar" style="background:${color}">${emoji}</div>
    <div class="msg-content-wrapper">
      <div class="msg-header">
        <span class="msg-name">${msg.user.name}</span>
        <span class="msg-time">${time}</span>
        <span class="msg-options" onclick="reportMessage('${msg.id}')">•••</span>
      </div>
      <div class="msg-content">${escapeHtml(msg.text)}</div>
    </div>
  `;
  
  messagesDiv.appendChild(msgElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// إضافة رسالة نظام
function addSystemMessage(text) {
  const messagesDiv = document.getElementById('messages');
  const msgElement = document.createElement('div');
  msgElement.className = 'system-msg';
  msgElement.textContent = text;
  messagesDiv.appendChild(msgElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// تحميل الرسائل
function loadMessages() {
  document.getElementById('messages').innerHTML = '';
  messages.forEach(msg => {
    if (msg.room === currentRoom) {
      displayMessage(msg);
    }
  });
}

// البحث عن صورة رمزية
function getAvatar(name, gender) {
  const letter = name.charAt(0).toUpperCase();
  const color = genderColors[gender] || genderColors.other;
  return { letter, color };
}

// تنظيف النصوص
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// القوائم الجانبية
function toggleSidebar(type) {
  const sidebar = document.getElementById(type + 'Sidebar');
  sidebar.classList.toggle('open');
}

function closeSidebar(type) {
  const sidebar = document.getElementById(type + 'Sidebar');
  sidebar.classList.remove('open');
}

// الوظائف المختلفة
function openStore() { alert('🛒 المتجر - قريباً'); }
function openPrivate() { alert('✉️ الرسائل الخاصة - قريباً'); }
function toggleLikes() { alert('❤️ الإعجابات - قريباً'); }
function toggleReports() { alert('📭 البلاغات - قريباً'); }
function toggleProfile() { alert('👤 الملف الشخصي - قريباً'); }
function openDrawing() { alert('➕ الرسم - قريباً'); }
function openSmilies() { alert('🫥 السمايلات - قريباً'); }
function recordVoice() { alert('🎤 الرسائل الصوتية - قريباً'); }
function toggleSound() { alert('🔊 كتم الصوت - قريباً'); }
function toggleRadio() { alert('▶️ الراديو - قريباً'); }
function showRooms() { alert('🏠 قائمة الغرف - قريباً'); }
function toggleSettings() { alert('⚙️ الإعدادات - قريباً'); }
function toggleUsers() { alert('👥 المتواجدون - قريباً'); }
function openNews() { alert('📰 الأخبار - قريباً'); }
function openFriendWall() { alert('🧱 حائط الأصدقاء - قريباً'); }
function openCredit() { alert('🪙 شراء رصيد - قريباً'); }
function toggleAddFriend() { alert('➕ إضافة صديق - قريباً'); }
function reportMessage(msgId) { alert('📋 الإبلاغ - قريباً'); }

// إرسال البيانات للخادم
function sendToServer(data) {
  console.log('إرسال للخادم:', data);
  // fetch('/api/message', { method: 'POST', body: JSON.stringify(data) });
}