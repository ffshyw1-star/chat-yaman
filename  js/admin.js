
# إنشاء ملف admin.js - منطق لوحة التحكم
admin_js = '''// ========== نظام لوحة التحكم - شات اليمن المطور ==========

class AdminSystem {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.users = [];
        this.mutes = [];
        this.kicks = [];
        this.reports = [];
        this.init();
    }

    init() {
        this.loadUser();
        this.setupEventListeners();
        this.generateDemoData();
        this.renderDashboard();
        this.renderUsers();
        this.renderMutes();
        this.renderKicks();
        this.renderReports();
        this.renderRooms();
        this.updateBadges();
    }

    // ===== تحميل بيانات المستخدم =====
    loadUser() {
        try {
            const userData = localStorage.getItem('chatUser');
            if (!userData) {
                window.location.href = 'index.html';
                return;
            }
            
            this.currentUser = JSON.parse(userData);
            
            // التحقق من صلاحيات الإدارة
            const allowedRoles = ['admin', 'owner', 'management', 'moderator'];
            if (!allowedRoles.includes(this.currentUser.role)) {
                this.showToast('ليس لديك صلاحية الوصول لهذه الصفحة', 'error');
                setTimeout(() => {
                    window.location.href = 'rooms.html';
                }, 1500);
                return;
            }
            
            // تحديث واجهة المستخدم
            const adminAvatar = document.getElementById('admin-avatar');
            const adminName = document.getElementById('admin-name');
            
            if (adminAvatar) adminAvatar.src = this.currentUser.avatar || '';
            if (adminName) adminName.textContent = this.currentUser.name || 'المالك';
            
        } catch (error) {
            console.error('Error loading user:', error);
            window.location.href = 'index.html';
        }
    }

    // ===== إعداد مستمعي الأحداث =====
    setupEventListeners() {
        // التنقل بين الأقسام
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.switchSection(section);
            });
        });

        // القائمة المتنقلة
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('admin-sidebar');
        
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
        }

        // زر الرجوع
        const backBtn = document.getElementById('mobile-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = 'rooms.html';
            });
        }

        // تحديث
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                refreshBtn.querySelector('i').classList.add('fa-spin');
                setTimeout(() => {
                    refreshBtn.querySelector('i').classList.remove('fa-spin');
                    this.showToast('تم التحديث بنجاح', 'success');
                }, 1000);
            });
        }

        // البحث في الأعضاء
        const usersSearch = document.getElementById('users-search');
        if (usersSearch) {
            usersSearch.addEventListener('input', (e) => {
                this.filterUsers(e.target.value);
            });
        }

        // فلترة الأعضاء
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterUsersByStatus(btn.dataset.filter);
            });
        });

        // حفظ الإعدادات
        document.querySelectorAll('.save-setting-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.saveSettings(btn.dataset.setting);
            });
        });

        // تسجيل الخروج
        const logoutBtn = document.getElementById('admin-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // إضافة غرفة
        const addRoomBtn = document.getElementById('add-room-btn');
        if (addRoomBtn) {
            addRoomBtn.addEventListener('click', () => this.addRoom());
        }
    }

    // ===== التنقل بين الأقسام =====
    switchSection(section) {
        this.currentSection = section;
        
        // تحديث القائمة
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === section);
        });
        
        // تحديث المحتوى
        document.querySelectorAll('.section-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        const targetPanel = document.getElementById(`${section}-section`);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
        
        // تحديث العنوان
        const titles = {
            dashboard: 'الإحصائيات',
            users: 'الأعضاء',
            mutes: 'الكتمات',
            kicks: 'الطردات',
            reports: 'البلاغات',
            rooms: 'الغرف',
            settings: 'إعدادات الموقع'
        };
        
        const sectionTitle = document.getElementById('section-title');
        if (sectionTitle) {
            sectionTitle.textContent = titles[section] || 'لوحة التحكم';
        }
        
        // إغلاق القائمة المتنقلة
        const sidebar = document.getElementById('admin-sidebar');
        if (sidebar) {
            sidebar.classList.remove('active');
        }
    }

    // ===== توليد بيانات تجريبية =====
    generateDemoData() {
        // مستخدمون
        this.users = [
            { id: 'u1', name: 'أحمد', username: 'ahmed', email: 'ahmed@demo.com', gender: 'male', age: 28, country: 'YE', countryFlag: '🇾🇪', role: 'owner', roleEmoji: '👑', roleName: 'مالك', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ahmed&backgroundColor=b6e3f4', status: 'متصل', isOnline: true, balance: 99999, likes: 156, room: 'general', joinedAt: '2026-01-15', lastSeen: new Date().toISOString() },
            { id: 'u2', name: 'سارة', username: 'sara', email: 'sara@demo.com', gender: 'female', age: 24, country: 'SA', countryFlag: '🇸🇦', role: 'admin', roleEmoji: '⭐', roleName: 'أدمن', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sara&backgroundColor=ffd5dc', status: 'متصل', isOnline: true, balance: 5000, likes: 89, room: 'general', joinedAt: '2026-02-01', lastSeen: new Date().toISOString() },
            { id: 'u3', name: 'محمد', username: 'mohammed', email: 'mohammed@demo.com', gender: 'male', age: 30, country: 'EG', countryFlag: '🇪🇬', role: 'management', roleEmoji: '☆', roleName: 'إدارة', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mohammed&backgroundColor=c0aede', status: 'متصل', isOnline: true, balance: 3000, likes: 67, room: 'yemen', joinedAt: '2026-02-10', lastSeen: new Date().toISOString() },
            { id: 'u4', name: 'فاطمة', username: 'fatima', email: 'fatima@demo.com', gender: 'female', age: 22, country: 'DZ', countryFlag: '🇩🇿', role: 'moderator', roleEmoji: '🛡️', roleName: 'مشرف', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fatima&backgroundColor=ffd5dc', status: 'متصل', isOnline: true, balance: 2500, likes: 45, room: 'algeria', joinedAt: '2026-03-01', lastSeen: new Date().toISOString() },
            { id: 'u5', name: 'خالد', username: 'khaled', email: 'khaled@demo.com', gender: 'male', age: 26, country: 'AE', countryFlag: '🇦🇪', role: 'premium', roleEmoji: '💎', roleName: 'مميز', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=khaled&backgroundColor=b6e3f4', status: 'متصل', isOnline: true, balance: 1500, likes: 34, room: 'general', joinedAt: '2026-03-15', lastSeen: new Date().toISOString() },
            { id: 'u6', name: 'نورة', username: 'nora', email: 'nora@demo.com', gender: 'female', age: 23, country: 'KW', countryFlag: '🇰🇼', role: 'member', roleEmoji: '🧑‍💼', roleName: 'عضو', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nora&backgroundColor=ffd5dc', status: 'غير متصل', isOnline: false, balance: 500, likes: 12, room: 'general', joinedAt: '2026-04-01', lastSeen: new Date(Date.now() - 86400000).toISOString() },
            { id: 'u7', name: 'علي', username: 'ali', email: 'ali@demo.com', gender: 'male', age: 25, country: 'IQ', countryFlag: '🇮🇶', role: 'member', roleEmoji: '🧑‍💼', roleName: 'عضو', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ali&backgroundColor=b6e3f4', status: 'متصل', isOnline: true, balance: 300, likes: 8, room: 'egypt', joinedAt: '2026-04-10', lastSeen: new Date().toISOString() },
            { id: 'u8', name: 'ليلى', username: 'laila', email: 'laila@demo.com', gender: 'female', age: 21, country: 'MA', countryFlag: '🇲🇦', role: 'guest', roleEmoji: '👤', roleName: 'زائر', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=laila&backgroundColor=ffd5dc', status: 'متصل', isOnline: true, balance: 0, likes: 3, room: 'general', joinedAt: '2026-07-19', lastSeen: new Date().toISOString() },
            { id: 'u9', name: 'عمر', username: 'omar', email: 'omar@demo.com', gender: 'male', age: 27, country: 'JO', countryFlag: '🇯🇴', role: 'guest', roleEmoji: '👤', roleName: 'زائر', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=omar&backgroundColor=b6e3f4', status: 'غير متصل', isOnline: false, balance: 0, likes: 0, room: 'saudi', joinedAt: '2026-07-18', lastSeen: new Date(Date.now() - 7200000).toISOString() },
            { id: 'u10', name: 'هند', username: 'hind', email: 'hind@demo.com', gender: 'female', age: 24, country: 'QA', countryFlag: '🇶🇦', role: 'premium', roleEmoji: '💎', roleName: 'مميز', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hind&backgroundColor=ffd5dc', status: 'متصل', isOnline: true, balance: 2000, likes: 56, room: 'uae', joinedAt: '2026-05-01', lastSeen: new Date().toISOString() }
        ];

        // كتمات
        this.mutes = [
            { id: 1, user: this.users[7], by: this.users[3], reason: 'إساءة', duration: '5 دقائق', date: '2026-07-19 14:30', active: true },
            { id: 2, user: this.users[8], by: this.users[2], reason: 'سب', duration: '10 دقائق', date: '2026-07-19 12:15', active: false },
            { id: 3, user: this.users[5], by: this.users[3], reason: 'إزعاج', duration: '2 دقائق', date: '2026-07-18 20:00', active: false }
        ];

        // طردات
        this.kicks = [
            { id: 1, user: this.users[7], by: this.users[2], reason: 'مخالفة قوانين الغرفة', duration: '30 دقيقة', date: '2026-07-19 15:00', active: true },
            { id: 2, user: this.users[8], by: this.users[1], reason: 'إساءة متكررة', duration: '1 ساعة', date: '2026-07-18 18:30', active: false }
        ];

        // بلاغات
        this.reports = [
            { id: 1, reporter: this.users[5], reported: this.users[7], reason: 'abuse', reasonText: 'إساءة', message: 'رسالة مسيئة من المستخدم', date: '2026-07-19 16:00', status: 'pending' },
            { id: 2, reporter: this.users[6], reported: this.users[8], reason: 'scam', reasonText: 'محتوى احتيال', message: 'محاولة نصب واحتيال', date: '2026-07-19 14:00', status: 'pending' },
            { id: 3, reporter: this.users[4], reported: this.users[5], reason: 'other', reasonText: 'غير ذلك', message: 'محتوى غير لائق', date: '2026-07-18 22:00', status: 'resolved' }
        ];
    }

    // ===== عرض لوحة الإحصائيات =====
    renderDashboard() {
        // نشاط الغرف
        const roomActivity = document.getElementById('room-activity');
        if (roomActivity) {
            const rooms = [
                { name: '🌎 العامة', users: 342, color: 'linear-gradient(90deg, #6366f1, #818cf8)' },
                { name: '🇾🇪 اليمن', users: 156, color: 'linear-gradient(90deg, #10b981, #34d399)' },
                { name: '🇩🇿 الجزائر', users: 89, color: 'linear-gradient(90deg, #f59e0b, #fbbf24)' },
                { name: '🇪🇬 مصر', users: 203, color: 'linear-gradient(90deg, #ec4899, #f472b6)' },
                { name: '🇸🇦 السعودية', users: 178, color: 'linear-gradient(90deg, #3b82f6, #60a5fa)' },
                { name: '🇦🇪 الإمارات', users: 67, color: 'linear-gradient(90deg, #8b5cf6, #a78bfa)' }
            ];
            
            const maxUsers = Math.max(...rooms.map(r => r.users));
            
            roomActivity.innerHTML = rooms.map(room => {
                const percentage = (room.users / maxUsers) * 100;
                return `
                    <div class="activity-bar">
                        <span class="activity-bar-label">${room.name}</span>
                        <div class="activity-bar-track">
                            <div class="activity-bar-fill" style="width: ${percentage}%; background: ${room.color};">
                                ${room.users}
                            </div>
                        </div>
                        <span class="activity-bar-value">${room.users}</span>
                    </div>
                `;
            }).join('');
        }

        // توزيع الرتب
        const rolesDistribution = document.getElementById('roles-distribution');
        if (rolesDistribution) {
            const roles = [
                { name: 'مالك', emoji: '👑', count: 1, color: '#f87171' },
                { name: 'أدمن', emoji: '⭐', count: 1, color: '#fbbf24' },
                { name: 'إدارة', emoji: '☆', count: 1, color: '#a78bfa' },
                { name: 'مشرف', emoji: '🛡️', count: 1, color: '#34d399' },
                { name: 'مميز', emoji: '💎', count: 2, color: '#f472b6' },
                { name: 'عضو', emoji: '🧑‍💼', count: 2, color: '#60a5fa' },
                { name: 'زائر', emoji: '👤', count: 2, color: '#9ca3af' }
            ];
            
            rolesDistribution.innerHTML = roles.map(role => `
                <div class="role-stat">
                    <div class="role-stat-info">
                        <span class="role-stat-icon">${role.emoji}</span>
                        <span class="role-stat-name">${role.name}</span>
                    </div>
                    <span class="role-stat-count" style="color: ${role.color}">${role.count}</span>
                </div>
            `).join('');
        }

        // آخر النشاطات
        const activityList = document.getElementById('activity-list');
        if (activityList) {
            const activities = [
                { type: 'join', icon: 'fa-user-plus', text: 'انضمام خالد للموقع', time: 'منذ 5 دقائق' },
                { type: 'mute', icon: 'fa-microphone-slash', text: 'كتم ليلى لمدة 5 دقائق', time: 'منذ 15 دقيقة' },
                { type: 'report', icon: 'fa-flag', text: 'بلاغ جديد من نورة', time: 'منذ 30 دقيقة' },
                { type: 'purchase', icon: 'fa-shopping-cart', text: 'شراء رتبة مميز من هند', time: 'منذ ساعة' },
                { type: 'join', icon: 'fa-user-plus', text: 'انضمام عمر للموقع', time: 'منذ ساعتين' }
            ];
            
            activityList.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon ${activity.type}">
                        <i class="fas ${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <p>${activity.text}</p>
                        <span>${activity.time}</span>
                    </div>
                </div>
            `).join('');
        }
    }

    // ===== عرض الأعضاء =====
    renderUsers() {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;
        
        const roleOrder = { owner: 0, admin: 1, management: 2, moderator: 3, premium: 4, member: 5, guest: 6 };
        const sortedUsers = [...this.users].sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
        
        tbody.innerHTML = sortedUsers.map(user => `
            <tr>
                <td>
                    <div class="user-cell">
                        <img src="${user.avatar}" alt="${user.name}">
                        <div class="user-cell-info">
                            <span class="user-cell-name">${user.name}</span>
                            <span class="user-cell-username">@${user.username}</span>
                        </div>
                    </div>
                </td>
                <td><span class="role-cell ${user.role}">${user.roleEmoji} ${user.roleName}</span></td>
                <td>${user.countryFlag} ${this.getRoomName(user.room)}</td>
                <td><span class="status-dot ${user.isOnline ? 'online' : 'offline'}"></span> ${user.status}</td>
                <td>${this.formatDate(user.lastSeen)}</td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn" title="عرض الملف" onclick="adminSystem.viewUser('${user.id}')"><i class="fas fa-eye"></i></button>
                        <button class="action-btn" title="تعديل" onclick="adminSystem.editUser('${user.id}')"><i class="fas fa-edit"></i></button>
                        <button class="action-btn danger" title="حظر" onclick="adminSystem.banUser('${user.id}')"><i class="fas fa-ban"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // ===== عرض الكتمات =====
    renderMutes() {
        const container = document.getElementById('mutes-list');
        if (!container) return;
        
        container.innerHTML = this.mutes.map(mute => `
            <div class="punishment-item">
                <img src="${mute.user.avatar}" alt="${mute.user.name}" class="punishment-avatar">
                <div class="punishment-info">
                    <h4>${mute.user.name}</h4>
                    <p>بواسطة: ${mute.by.name} | السبب: ${mute.reason}</p>
                </div>
                <div class="punishment-meta">
                    <div class="punishment-duration">${mute.duration}</div>
                    <div class="punishment-date">${mute.date}</div>
                </div>
                <div class="punishment-actions">
                    ${mute.active ? `
                        <button class="action-btn" title="فك الكتم" onclick="adminSystem.unmuteUser(${mute.id})"><i class="fas fa-microphone"></i></button>
                    ` : '<span style="color:var(--text-muted);font-size:0.8rem;">منتهي</span>'}
                </div>
            </div>
        `).join('');
    }

    // ===== عرض الطردات =====
    renderKicks() {
        const container = document.getElementById('kicks-list');
        if (!container) return;
        
        container.innerHTML = this.kicks.map(kick => `
            <div class="punishment-item">
                <img src="${kick.user.avatar}" alt="${kick.user.name}" class="punishment-avatar">
                <div class="punishment-info">
                    <h4>${kick.user.name}</h4>
                    <p>بواسطة: ${kick.by.name} | السبب: ${kick.reason}</p>
                </div>
                <div class="punishment-meta">
                    <div class="punishment-duration">${kick.duration}</div>
                    <div class="punishment-date">${kick.date}</div>
                </div>
                <div class="punishment-actions">
                    ${kick.active ? `
                        <button class="action-btn" title="فك الطرد" onclick="adminSystem.unkickUser(${kick.id})"><i class="fas fa-user-check"></i></button>
                    ` : '<span style="color:var(--text-muted);font-size:0.8rem;">منتهي</span>'}
 