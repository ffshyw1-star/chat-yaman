// متغيرات عامة
let token = localStorage.getItem('adminToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};

// التحقق من تسجيل الدخول
if (!token) {
  window.location.href = '/admin-login.html';
}

// تحديث اسم المسؤول
document.getElementById('adminName').textContent = currentUser.username || 'مسؤول النظام';
document.getElementById('userName').textContent = currentUser.username || 'أدمن';
document.getElementById('userRole').textContent = currentUser.role || 'مسؤول النظام';

// ==================== الدوال الأساسية ====================

// إظهار/إخفاء الأقسام
function showSection(sectionId) {
  document.querySelectorAll('.section-container').forEach(el => {
    el.style.display = 'none';
  });
  document.getElementById(sectionId).style.display = 'block';

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  event.target.classList.add('active');

  // تحديث العنوان
  const titles = {
    dashboard: 'لوحة التحكم',
    users: 'إدارة المستخدمين',
    rooms: 'إدارة الغرف',
    reports: 'البلاغات',
    logs: 'السجلات'
  };
  document.getElementById('pageTitle').textContent = titles[sectionId] || '';

  // تحميل البيانات
  if (sectionId === 'dashboard') {
    loadDashboard();
  } else if (sectionId === 'users') {
    loadUsers();
  } else if (sectionId === 'rooms') {
    loadRooms();
  } else if (sectionId === 'reports') {
    loadReports();
  } else if (sectionId === 'logs') {
    loadLogs();
  }
}

// الطلب من API
async function apiCall(method, endpoint, body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`/api/admin${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'حدث خطأ');
    }

    return data;
  } catch (error) {
    alert('❌ ' + error.message);
    throw error;
  }
}

// ==================== لوحة التحكم ====================

async function loadDashboard() {
  try {
    const stats = await apiCall('GET', '/dashboard/stats');

    document.getElementById('stat-users').textContent = stats.totalUsers || 0;
    document.getElementById('stat-online').textContent = stats.onlineUsers || 0;
    document.getElementById('stat-rooms').textContent = stats.activeRooms || 0;
    document.getElementById('stat-messages').textContent = stats.totalMessages || 0;
    document.getElementById('stat-reports').textContent = stats.pendingReports || 0;
    document.getElementById('stat-banned').textContent = stats.bannedUsers || 0;
  } catch (error) {
    console.error('خطأ في تحميل الإحصائيات:', error);
  }
}

// ==================== إدارة المستخدمين ====================

async function loadUsers() {
  try {
    const users = await apiCall('GET', '/users');
    const table = document.getElementById('usersTable');

    if (users.length === 0) {
      table.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <div class="empty-state-icon">😴</div>
            لا يوجد مستخدمون
          </td>
        </tr>
      `;
      return;
    }

    table.innerHTML = users.map(user => `
      <tr>
        <td>${user.username}</td>
        <td>${user.email || '-'}</td>
        <td>
          <select onchange="changeUserRole(${user.id}, this.value)" style="padding: 5px;">
            <option value="زائر" ${user.role === 'زائر' ? 'selected' : ''}>زائر</option>
            <option value="عضو" ${user.role === 'عضو' ? 'selected' : ''}>عضو</option>
            <option value="مميز" ${user.role === 'مميز' ? 'selected' : ''}>مميز</option>
            <option value="مشرف" ${user.role === 'مشرف' ? 'selected' : ''}>مشرف</option>
            <option value="إدارة" ${user.role === 'إدارة' ? 'selected' : ''}>إدارة</option>
            <option value="أدمن" ${user.role === 'أدمن' ? 'selected' : ''}>أدمن</option>
          </select>
        </td>
        <td>
          <span class="badge ${user.is_banned ? 'badge-banned' : 'badge-online'}">
            ${user.is_banned ? '🚫 محظور' : '🟢 نشط'}
          </span>
        </td>
        <td>
          <div class="btn-group">
            <button class="btn btn-warning" onclick="addCreditToUser(${user.id})">💰 رصيد</button>
            <button class="btn ${user.is_banned ? 'btn-success' : 'btn-danger'}" onclick="toggleBanUser(${user.id}, ${!user.is_banned})">
              ${user.is_banned ? '✅ فك الحظر' : '🚫 حظر'}
            </button>
            <button class="btn btn-danger" onclick="deleteUser(${user.id})">🗑️ حذف</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('خطأ في تحميل المستخدمين:', error);
  }
}

async function changeUserRole(userId, role) {
  if (!confirm(`هل تريد تغيير الرتبة إلى ${role}؟`)) return;

  try {
    await apiCall('PUT', `/users/${userId}/role`, { role });
    alert('✅ تم تغيير الرتبة بنجاح');
    loadUsers();
  } catch (error) {
    console.error('خطأ:', error);
  }
}

async function toggleBanUser(userId, isBanned) {
  const action = isBanned ? 'حظر' : 'فك الحظر';
  if (!confirm(`هل تريد ${action} هذا المستخدم؟`)) return;

  try {
    await apiCall('PUT', `/users/${userId}/ban`, { isBanned });
    alert('✅ تم التحديث بنجاح');
    loadUsers();
  } catch (error) {
    console.error('خطأ:', error);
  }
}

function addCreditToUser(userId) {
  const amount = prompt('أدخل المبلغ:');
  if (!amount || amount <= 0) return;

  apiCall('POST', `/users/${userId}/credit`, { amount: parseInt(amount) }).then(() => {
    alert('✅ تم إضافة الرصيد');
    loadUsers();
  });
}

async function deleteUser(userId) {
  if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;

  try {
    await apiCall('DELETE', `/users/${userId}`);
    alert('✅ تم حذف المستخدم');
    loadUsers();
  } catch (error) {
    console.error('خطأ:', error);
  }
}

function searchUsers() {
  const query = document.getElementById('userSearch').value;
  if (!query) {
    loadUsers();
    return;
  }

  apiCall('GET', `/users/search?q=${query}`).then(users => {
    const table = document.getElementById('usersTable');
    table.innerHTML = users.map(user => `
      <tr>
        <td>${user.username}</td>
        <td>${user.email || '-'}</td>
        <td>${user.role}</td>
        <td><span class="badge ${user.is_banned ? 'badge-banned' : 'badge-online'}">${user.is_banned ? '🚫' : '🟢'}</span></td>
        <td>
          <div class="btn-group">
            <button class="btn btn-danger" onclick="deleteUser(${user.id})">حذف</button>
          </div>
        </td>
      </tr>
    `).join('');
  });
}

// ==================== إدارة الغرف ====================

async function loadRooms() {
  try {
    const rooms = await apiCall('GET', '/rooms');
    const table = document.getElementById('roomsTable');

    if (rooms.length === 0) {
      table.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <div class="empty-state-icon">🏠</div>
            لا توجد غرف
          </td>
        </tr>
      `;
      return;
    }

    table.innerHTML = rooms.map(room => `
      <tr>
        <td>${room.name}</td>
        <td>${room.active_users || 0}</td>
        <td>${room.total_messages || 0}</td>
        <td>
          <span class="badge ${room.is_active ? 'badge-online' : 'badge-offline'}">
            ${room.is_active ? '✅ نشطة' : '❌ معطلة'}
          </span>
        </td>
        <td>
          <div class="btn-group">
            <button class="btn btn-warning" onclick="editRoom(${room.id})">✏️ تعديل</button>
            <button class="btn ${room.is_active ? 'btn-danger' : 'btn-success'}" onclick="toggleRoom(${room.id}, ${!room.is_active})">
              ${room.is_active ? '⏸️ تعطيل' : '▶️ تفعيل'}
            </button>
            <button class="btn btn-danger" onclick="deleteRoom(${room.id})">🗑️ حذف</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('خطأ في تحميل الغرف:', error);
  }
}

async function toggleRoom(roomId, isActive) {
  try {
    await apiCall('PUT', `/rooms/${roomId}/status`, { isActive });
    alert('✅ تم تحديث حالة الغرفة');
    loadRooms();
  } catch (error) {
    console.error('خطأ:', error);
  }
}

async function deleteRoom(roomId) {
  if (!confirm('هل تريد حذف هذه الغرفة؟')) return;

  try {
    await apiCall('DELETE', `/rooms/${roomId}`);
    alert('✅ تم حذف الغرفة');
    loadRooms();
  } catch (error) {
    console.error('خطأ:', error);
  }
}

function editRoom(roomId) {
  alert('قريباً: تعديل الغرفة');
}

function openCreateRoomModal() {
  document.getElementById('createRoomModal').classList.add('show');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('show');
}

async function createRoom() {
  const name = document.getElementById('roomName').value;
  const description = document.getElementById('roomDescription').value;

  if (!name) {
    alert('❌ يجب إدخال اسم الغرفة');
    return;
  }

  try {
    await apiCall('POST', '/rooms/create', { name, description });
    alert('✅ تم إنشاء الغرفة');
    document.getElementById('roomName').value = '';
    document.getElementById('roomDescription').value = '';
    closeModal('createRoomModal');
    loadRooms();
  } catch (error) {
    console.error('خطأ:', error);
  }
}

// ==================== البلاغات ====================

async function loadReports() {
  try {
    const reports = await apiCall('GET', '/reports');
    const table = document.getElementById('reportsTable');

    if (reports.length === 0) {
      table.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <div class="empty-state-icon">📭</div>
            لا توجد بلاغات معلقة
          </td>
        </tr>
      `;
      return;
    }

    table.innerHTML = reports.map(report => `
      <tr>
        <td>${report.reporter_username}</td>
        <td>${report.message_text.substring(0, 30)}...</td>
        <td>${report.reason}</td>
        <td>${new Date(report.created_at).toLocaleDateString('ar-YE')}</td>
        <td>
          <div class="btn-group">
            <button class="btn btn-success" onclick="handleReport(${report.id}, 'approved', 'delete_message')">✅ حذف</button>
            <button class="btn btn-warning" onclick="handleReport(${report.id}, 'approved', 'warn_user')">⚠️ تحذير</button>
            <button class="btn btn-danger" onclick="handleReport(${report.id}, 'approved', 'ban_user')">🚫 حظر</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('خطأ في تحميل البلاغات:', error);
  }
}

async function handleReport(reportId, status, action) {
  try {
    await apiCall('POST', `/reports/${reportId}/handle`, { status, action });
    alert('✅ تم معالجة البلاغ');
    loadReports();
  } catch (error) {
    console.error('خطأ:', error);
  }
}

// ==================== السجلات ====================

async function loadLogs() {
  try {
    const logs = await apiCall('GET', '/logs/activity?limit=50');
    const table = document.getElementById('logsTable');

    if (logs.length === 0) {
      table.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            <div class="empty-state-icon">📝</div>
            لا توجد سجلات
          </td>
        </tr>
      `;
      return;
    }

    table.innerHTML = logs.map(log => `
      <tr>
        <td>${log.username || 'النظام'}</td>
        <td>${log.action}</td>
        <td>${log.details}</td>
        <td>${new Date(log.created_at).toLocaleDateString('ar-YE')}</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('خطأ في تحميل السجلات:', error);
  }
}

// ==================== تسجيل الخروج ====================

function logout() {
  if (confirm('هل تريد تسجيل الخروج؟')) {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('currentUser');
    window.location.href = '/admin-login.html';
  }
}

// تحميل لوحة التحكم عند الدخول
window.addEventListener('load', () => {
  loadDashboard();
});