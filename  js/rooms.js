
# إنشاء ملف rooms.js - منطق صفحة الغرف
rooms_js = '''// ========== نظام الغرف - شات اليمن المطور ==========

class RoomsSystem {
    constructor() {
        this.currentUser = null;
        this.rooms = {
            general: { name: 'غرفة العامة', icon: '🌎', users: 342 },
            yemen: { name: 'غرفة اليمن', icon: '🇾🇪', users: 156 },
            algeria: { name: 'غرفة الجزائر', icon: '🇩🇿', users: 89 },
            egypt: { name: 'غرفة مصر', icon: '🇪🇬', users: 203 },
            saudi: { name: 'غرفة السعودية', icon: '🇸🇦', users: 178 },
            uae: { name: 'غرفة الإمارات', icon: '🇦🇪', users: 67 }
        };
        this.init();
    }

    init() {
        this.loadUser();
        this.setupEventListeners();
        this.updateOnlineCounts();
        this.startRealtimeSimulation();
    }

    // ===== تحميل بيانات المستخدم =====
    loadUser() {
        try {
            const userData = localStorage.getItem('chatUser');
            if (!userData) {
                // إعادة توجيه للصفحة الرئيسية إذا لم يكن هناك مستخدم
                window.location.href = 'index.html';
                return;
            }
            
            this.currentUser = JSON.parse(userData);
            this.updateUserUI();
        } catch (error) {
            console.error('Error loading user:', error);
            window.location.href = 'index.html';
        }
    }

    // ===== تحديث واجهة المستخدم =====
    updateUserUI() {
        if (!this.currentUser) return;
        
        // صورة المستخدم المصغرة
        const miniAvatar = document.getElementById('mini-avatar');
        if (miniAvatar) {
            miniAvatar.src = this.currentUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest';
            miniAvatar.alt = this.currentUser.name;
        }
        
        // اسم المستخدم
        const miniName = document.getElementById('mini-name');
        if (miniName) {
            miniName.textContent = this.currentUser.name;
        }
        
        // الرصيد
        const userBalance = document.getElementById('user-balance');
        if (userBalance) {
            userBalance.textContent = this.currentUser.balance || 0;
        }
        
        // الرتبة
        const userRole = document.getElementById('user-role');
        if (userRole) {
            userRole.textContent = `${this.currentUser.roleEmoji || '👤'} ${this.currentUser.roleName || 'زائر'}`;
        }
        
        // اللايكات
        const userLikes = document.getElementById('user-likes');
        if (userLikes) {
            userLikes.textContent = this.currentUser.likes || 0;
        }
    }

    // ===== إعداد مستمعي الأحداث =====
    setupEventListeners() {
        // أزرار الدخول للغرف
        document.querySelectorAll('.enter-room-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const roomId = btn.dataset.room;
                this.enterRoom(roomId);
            });
        });
        
        // النقر على بطاقة الغرفة
        document.querySelectorAll('.room-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.enter-room-btn')) {
                    const roomId = card.dataset.room;
                    this.enterRoom(roomId);
                }
            });
        });
        
        // زر الخروج
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        
        // زر الإشعارات
        const notifBtn = document.getElementById('notifications-btn');
        if (notifBtn) {
            notifBtn.addEventListener('click', () => {
                this.showToast('لا توجد إشعارات جديدة', 'info');
            });
        }
        
        // النقر على صورة المستخدم
        const userMini = document.getElementById('user-mini');
        if (userMini) {
            userMini.addEventListener('click', () => {
                window.location.href = 'profile.html';
            });
        }
    }

    // ===== الدخول للغرفة =====
    async enterRoom(roomId) {
        const room = this.rooms[roomId];
        if (!room) return;
        
        this.showLoading(true);
        
        try {
            // محاكاة تأخير الشبكة
            await this.simulateDelay(800);
            
            // تحديث بيانات المستخدم
            this.currentUser.room = roomId;
            this.currentUser.lastSeen = new Date().toISOString();
            localStorage.setItem('chatUser', JSON.stringify(this.currentUser));
            
            // إضافة رسالة نظامية
            const systemMessage = {
                type: 'system',
                text: `انضم ${this.currentUser.name} للغرفة، هلا وسهلاً 🎉`,
                timestamp: new Date().toISOString(),
                room: roomId
            };
            
            // حفظ الرسالة في التخزين المحلي
            const roomMessages = JSON.parse(localStorage.getItem(`messages_${roomId}`) || '[]');
            roomMessages.push(systemMessage);
            localStorage.setItem(`messages_${roomId}`, JSON.stringify(roomMessages));
            
            this.showToast(`أهلاً بك في ${room.name}!`, 'success');
            
            // الانتقال لصفحة الدردشة
            setTimeout(() => {
                window.location.href = `chat.html?room=${roomId}`;
            }, 800);
            
        } catch (error) {
            console.error('Error entering room:', error);
            this.showToast('حدث خطأ في الدخول للغرفة', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // ===== تحديث عدد المتصلين =====
    updateOnlineCounts() {
        document.querySelectorAll('.room-card').forEach(card => {
            const roomId = card.dataset.room;
            const countEl = card.querySelector('.room-users .count');
            if (countEl && this.rooms[roomId]) {
                // إضافة تقلبات عشوائية واقعية
                const baseCount = this.rooms[roomId].users;
                const variation = Math.floor(Math.random() * 20) - 10;
                countEl.textContent = Math.max(10, baseCount + variation);
            }
        });
    }

    // ===== محاكاة تحديث فوري =====
    startRealtimeSimulation() {
        // تحديث العدادات كل 30 ثانية
        setInterval(() => {
            this.updateOnlineCounts();
        }, 30000);
        
        // محاكاة إشعارات
        setTimeout(() => {
            const badge = document.getElementById('notif-badge');
            if (badge && Math.random() > 0.5) {
                badge.textContent = Math.floor(Math.random() * 3) + 1;
                badge.style.display = 'flex';
            }
        }, 5000);
    }

    // ===== تسجيل الخروج =====
    logout() {
        if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
            // تحديث حالة المستخدم
            if (this.currentUser) {
                this.currentUser.isOnline = false;
                this.currentUser.lastSeen = new Date().toISOString();
                
                // تحديث في قائمة المستخدمين المسجلين
                const storedUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
                const userIndex = storedUsers.findIndex(u => u.id === this.currentUser.id);
                if (userIndex !== -1) {
                    storedUsers[userIndex] = this.currentUser;
                    localStorage.setItem('registeredUsers', JSON.stringify(storedUsers));
                }
            }
            
            // حذف بيانات الجلسة
            localStorage.removeItem('chatUser');
            localStorage.removeItem('chatToken');
            
            this.showToast('تم تسجيل الخروج بنجاح', 'success');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    }

    // ===== Toast Notifications =====
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${icons[type]}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        // إزالة بعد 3.5 ثانية
        setTimeout(() => {
            toast.style.animation = 'toastOut 0.4s ease-in forwards';
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }

    // ===== Loading Overlay =====
    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.toggle('active', show);
        }
    }

    // ===== محاكاة تأخير =====
    simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ===== تهيئة النظام =====
document.addEventListener('DOMContentLoaded', () => {
    window.roomsSystem = new RoomsSystem();
});
'''

with open("/mnt/agents/output/chat-yemen/js/rooms.js", "w", encoding="utf-8") as f:
    f.write(rooms_js)
    
print("✅ تم إنشاء js/rooms.js")