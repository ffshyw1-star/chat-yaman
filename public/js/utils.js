// ==================== دوال محسّنة للمهام الشائعة ====================

/**
 * إظهار رسالة تنبيه مخصصة
 * @param {string} message - نص الرسالة
 * @param {string} type - نوع التنبيه (success, error, warning, info)
 * @param {number} duration - مدة الظهور بالميلي ثانية
 */
function showNotification(message, type = 'success', duration = 3000) {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">${getNotificationIcon(type)}</span>
      <span class="notification-text">${message}</span>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">✕</button>
    </div>
  `;

  // إضافة الأنماط إذا لم تكن موجودة
  if (!document.getElementById('notificationStyles')) {
    const style = document.createElement('style');
    style.id = 'notificationStyles';
    style.textContent = `
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
      }

      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .notification-success {
        background: #e8f5e9;
        color: #2e7d32;
        border-right: 4px solid #4CAF50;
      }

      .notification-error {
        background: #ffebee;
        color: #c62828;
        border-right: 4px solid #E91E63;
      }

      .notification-warning {
        background: #fff3e0;
        color: #e65100;
        border-right: 4px solid #FF9800;
      }

      .notification-info {
        background: #e3f2fd;
        color: #1565c0;
        border-right: 4px solid #2196F3;
      }

      .notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .notification-icon {
        font-size: 18px;
      }

      .notification-text {
        flex: 1;
        font-size: 14px;
      }

      .notification-close {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 16px;
        opacity: 0.6;
        transition: 0.3s;
      }

      .notification-close:hover {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, duration);
}

function getNotificationIcon(type) {
  const icons = {
    'success': '✅',
    'error': '❌',
    'warning': '⚠️',
    'info': 'ℹ️'
  };
  return icons[type] || '✅';
}

/**
 * تأكيد تفاعلي
 * @param {string} message - رسالة التأكيد
 * @param {function} onConfirm - الدالة عند التأكيد
 * @param {function} onCancel - الدالة عند الإلغاء
 */
function showConfirm(message, onConfirm, onCancel) {
  const backdrop = document.createElement('div');
  backdrop.className = 'confirm-backdrop';

  const dialog = document.createElement('div');
  dialog.className = 'confirm-dialog';
  dialog.innerHTML = `
    <div class="confirm-content">
      <h3>تأكيد العملية</h3>
      <p>${message}</p>
      <div class="confirm-actions">
        <button class="btn-confirm-yes" onclick="confirmAction(true)">✅ نعم</button>
        <button class="btn-confirm-no" onclick="confirmAction(false)">❌ لا</button>
      </div>
    </div>
  `;

  if (!document.getElementById('confirmStyles')) {
    const style = document.createElement('style');
    style.id = 'confirmStyles';
    style.textContent = `
      .confirm-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 9998;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .confirm-dialog {
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 400px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        animation: popIn 0.3s ease;
      }

      @keyframes popIn {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      .confirm-content h3 {
        color: #075e54;
        margin-bottom: 15px;
        font-size: 18px;
      }

      .confirm-content p {
        color: #666;
        margin-bottom: 25px;
        line-height: 1.6;
      }

      .confirm-actions {
        display: flex;
        gap: 10px;
      }

      .btn-confirm-yes,
      .btn-confirm-no {
        flex: 1;
        padding: 12px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        transition: 0.3s;
      }

      .btn-confirm-yes {
        background: #4CAF50;
        color: white;
      }

      .btn-confirm-yes:hover {
        background: #388e3c;
      }

      .btn-confirm-no {
        background: #E91E63;
        color: white;
      }

      .btn-confirm-no:hover {
        background: #d81b60;
      }
    `;
    document.head.appendChild(style);
  }

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);

  window.confirmAction = function(confirmed) {
    backdrop.remove();
    if (confirmed && onConfirm) {
      onConfirm();
    } else if (!confirmed && onCancel) {
      onCancel();
    }
  };
}

/**
 * عرض جدول البيانات بشكل محسّن
 * @param {Array} data - البيانات
 * @param {Array} columns - الأعمدة
 * @param {string} containerId - معرّف المحتوى
 */
function renderTable(data, columns, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">لا توجد بيانات</div>
      </div>
    `;
    return;
  }

  let html = '<table><thead><tr>';

  // رؤوس الجدول
  columns.forEach(col => {
    html += `<th>${col.title}</th>`;
  });
  html += '</tr></thead><tbody>';

  // صفوف البيانات
  data.forEach(row => {
    html += '<tr>';
    columns.forEach(col => {
      const value = eval(`row.${col.key}`);
      html += `<td>${value || '-'}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

/**
 * تحويل التاريخ إلى صيغة مقروءة
 * @param {Date} date - التاريخ
 * @returns {string} التاريخ المقروء
 */
function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('ar-YE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * تحويل الأرقام الكبيرة إلى صيغة مختصرة
 * @param {number} num - الرقم
 * @returns {string} الصيغة المختصرة
 */
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * البحث في الجداول
 * @param {string} inputId - معرّف حقل البحث
 * @param {string} tableId - معرّف الجدول
 */
function setupTableSearch(inputId, tableId) {
  const input = document.getElementById(inputId);
  const table = document.getElementById(tableId);

  if (!input || !table) return;

  input.addEventListener('keyup', function() {
    const filter = this.value.toLowerCase();
    const rows = table.querySelectorAll('tbody tr');

    rows.forEach(row => {
      const text = row.innerText.toLowerCase();
      row.style.display = text.includes(filter) ? '' : 'none';
    });
  });
}

/**
 * تصدير البيانات إلى CSV
 * @param {Array} data - البيانات
 * @param {string} filename - اسم الملف
 */
function exportToCSV(data, filename = 'data.csv') {
  const csv = [
    Object.keys(data[0]).join(','),
    ...data.map(row => Object.values(row).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

/**
 * إضافة تأثير التحميل
 * @param {HTMLElement} element - العنصر
 * @param {boolean} isLoading - هل يتم التحميل
 */
function setLoading(element, isLoading) {
  if (isLoading) {
    element.disabled = true;
    element.innerHTML = '<span class="loading"></span> جاري التحميل...';
  } else {
    element.disabled = false;
    element.innerHTML = element.dataset.originalText || element.innerHTML;
  }
}

/**
 * التحقق من الصلاحيات
 * @param {string} requiredRole - الرتبة المطلوبة
 * @returns {boolean} هل المستخدم لديه الصلاحية
 */
function hasPermission(requiredRole) {
  const user = JSON.parse(localStorage.getItem('currentUser')) || {};
  const roles = ['زائر', 'عضو', 'مميز', 'مشرف', 'إدارة', 'أدمن', 'مالك'];
  const userRoleIndex = roles.indexOf(user.role);
  const requiredRoleIndex = roles.indexOf(requiredRole);
  return userRoleIndex >= requiredRoleIndex;
}

/**
 * منع الإجراءات غير المصرح بها
 * @param {string} action - الإجراء
 */
function checkPermission(action) {
  if (!hasPermission('أدمن')) {
    showNotification('❌ ليس لديك صلاحيات كافية', 'error');
    return false;
  }
  return true;
}

/**
 * تنسيق حجم الملف
 * @param {number} bytes - عدد البايتات
 * @returns {string} الحجم المنسق
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * إعادة محاولة الطلب تلقائياً في حالة الفشل
 * @param {Function} fn - الدالة
 * @param {number} retries - عدد المحاولات
 * @param {number} delay - التأخير بين المحاولات
 */
async function retryAsync(fn, retries = 3, delay = 1000) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * تخزين مؤقت للبيانات
 */
class DataCache {
  constructor(ttl = 5 * 60 * 1000) {
    this.cache = {};
    this.ttl = ttl;
  }

  set(key, value) {
    this.cache[key] = {
      value,
      timestamp: Date.now()
    };
  }

  get(key) {
    const item = this.cache[key];
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      delete this.cache[key];
      return null;
    }

    return item.value;
  }

  clear() {
    this.cache = {};
  }
}

// تصدير للاستخدام الخارجي
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showNotification,
    showConfirm,
    renderTable,
    formatDate,
    formatNumber,
    setupTableSearch,
    exportToCSV,
    setLoading,
    hasPermission,
    checkPermission,
    formatFileSize,
    retryAsync,
    DataCache
  };
}