
# إنشاء ملف profile.js - منطق صفحة الملف الشخصي
profile_js = '''// ========== نظام الملف الشخصي - شات اليمن المطور ==========

class ProfileSystem {
    constructor() {
        this.currentUser = null;
        this.viewedUser = null;
        this.isOwnProfile = true;
        this.isAdmin = false;
        this.init();
    }

    init() {
        this.loadUser();
        this.checkViewedUser();
        this.setupEventListeners();
        this.renderProfile();
        this.renderFriends();
        this.updateAdminUI();
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
            this.isAdmin = ['admin', 'owner', 'management', 'moderator'].includes(this.currentUser.role);
            
        } catch (error) {
            console.error('Error loading user:', error);
            window.location.href = 'index.html';
        }
    }

    // ===== التحقق من المستخدم المعروض =====
    checkViewedUser() {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('user');
        
        if (userId && userId !== this.currentUser.id) {
            // البحث عن المستخدم في قائمة المستخدمين التجريبية
            const demoUsers = [
                { id: 'u1', name: 'أحمد', username: 'ahmed', gender: 'male', age: 28, country: 'YE', countryFlag: '🇾🇪', countryName: 'اليمن', role: 'owner', roleEmoji: '👑', roleName: 'مالك', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ahmed&backgroundColor=b6e3f4', status: 'متصل', isOnline: true, balance: 99999, likes: 156, bio: 'مالك الموقع', lastSeen: new Date().toISOString() },
                { id: 'u2', name: 'سارة', username: 'sara', gender: 'female', age: 24, country: 'SA', countryFlag: '🇸🇦', countryName: 'السعودية', role: 'admin', roleEmoji: '⭐', roleName: 'أدمن', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sara&backgroundColor=ffd5dc', status: 'متصل', isOnline: true, balance: 5000, likes: 89, bio: 'أدمن الموقع', lastSeen: new Date().toISOString() },
                { id: 'u3', name: 'محمد', username: 'mohammed', gender: 'male', age: 30, country: 'EG', countryFlag: '🇪🇬', countryName: 'مصر', role: 'management', roleEmoji: '☆', roleName: 'إدارة', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mohammed&backgroundColor=c0aede', status: 'متصل', isOnline: true, balance: 3000, likes: 67, bio: 'إدارة الموقع', lastSeen: new Date().toISOString() }
            ];
            
            this.viewedUser = demoUsers.find(u => u.id === userId);
            if (this.viewedUser) {
                this.isOwnProfile = false;
            }
        }
        
        if (!this.viewedUser) {
            this.viewedUser = this.currentUser;
            this.isOwnProfile = true;
        }
    }

    // ===== إعداد مستمعي الأحداث =====
    setupEventListeners() {
        // زر الرجوع
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.history.back();
            });
        }

        // تبويبات الملف الشخصي
        document.querySelectorAll('.profile-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                
                document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                
                tab.classList.add('active');
                document.getElementById(`${tabId}-panel`).classList.add('active');
            });
        });

        // زر اللايك
        const likeBtn = document.getElementById('like-btn');
        if (likeBtn && !this.isOwnProfile) {
            likeBtn.addEventListener('click', () => this.likeUser());
        } else if (likeBtn && this.isOwnProfile) {
            likeBtn.style.display = 'none';
        }

        // زر الرسالة
        const messageBtn = document.getElementById('message-btn');
        if (messageBtn && !this.isOwnProfile) {
            messageBtn.addEventListener('click', () => {
                window.location.href = `chat.html?private=${this.viewedUser.id}`;
            });
        } else if (messageBtn && this.isOwnProfile) {
            messageBtn.style.display = 'none';
        }

        // زر الأمر الإداري
        const adminCommandBtn = document.getElementById('admin-command-btn');
        if (adminCommandBtn) {
            if (this.isAdmin && !this.isOwnProfile) {
                adminCommandBtn.style.display = 'flex';
                adminCommandBtn.addEventListener('click', () => this.showAdminActions());
            } else {
                adminCommandBtn.style.display = 'none';
            }
        }

        // زر تعديل الملف
        const editBtn = document.getElementById('edit-profile-btn');
        if (editBtn) {
            if (this.isOwnProfile) {
                editBtn.addEventListener('click', () => this.openEditModal());
            } else {
                editBtn.style.display = 'none';
            }
        }

        // زر إضافة صديق
        const addFriendBtn = document.getElementById('add-friend-btn');
        if (addFriendBtn) {
            if (!this.isOwnProfile) {
                addFriendBtn.addEventListener('click', () => this.addFriend());
            } else {
                addFriendBtn.style.display = 'none';
            }
        }

        // زر خاص
        const privateChatBtn = document.getElementById('private-chat-btn');
        if (privateChatBtn) {
            if (!this.isOwnProfile) {
                privateChatBtn.addEventListener('click', () => {
                    window.location.href = `chat.html?private=${this.viewedUser.id}`;
                });
            } else {
                privateChatBtn.style.display = 'none';
            }
        }

        // إغلاق نافذة التعديل
        const closeEdit = document.getElementById('close-edit');
        const editOverlay = document.getElementById('edit-profile-overlay');
        
        if (closeEdit) {
            closeEdit.addEventListener('click', () => this.closeEditModal());
        }
        if (editOverlay) {
            editOverlay.addEventListener('click', () => this.closeEditModal());
        }

        // حفظ التعديلات
        const saveBtn = document.getElementById('save-profile-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveProfile());
        }

        // حذف الحساب
        const deleteBtn = document.getElementById('delete-account-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteAccount());
        }

        // القائمة
        const menuBtn = document.getElementById('profile-menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                if (confirm('هل تريد العودة للغرف؟')) {
                    window.location.href = 'rooms.html';
                }
            });
        }
    }

    // ===== عرض الملف الشخصي =====
    renderProfile() {
        const user = this.viewedUser;
        if (!user) return;

        // الصورة الشخصية
        const avatar = document.getElementById('profile-avatar-large');
        if (avatar) {
            avatar.src = user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest';
        }

        // الاسم
        const name = document.getElementById('profile-name');
        if (name) {
            name.textContent = user.name;
        }

        // الرتبة
        const role = document.getElementById('profile-role');
        if (role) {
            role.textContent = `${user.roleEmoji || '👤'} ${user.roleName || 'زائر'}`;
            role.setAttribute('data-role', user.role || 'guest');
        }

        // الحالة
        const status = document.getElementById('profile-status');
        if (status) {
            status.textContent = user.status || 'متصل';
        }

        // اللايكات
        const likesCount = document.getElementById('likes-count');
        if (likesCount) {
            likesCount.textContent = user.likes || 0;
        }

        // الرصيد
        const balance = document.getElementById('info-balance');
        if (balance) {
            balance.textContent = `${user.balance || 0} 💲`;
        }

        // البلد
        const country = document.getElementById('info-country');
        if (country) {
            country.textContent = `${user.countryFlag || '🇾🇪'} ${user.countryName || 'اليمن'}`;
        }

        // الجنس
        const gender = document.getElementById('info-gender');
        if (gender) {
            const genderMap = { male: 'ذكر', female: 'أنثى', other: 'آخر' };
            gender.textContent = genderMap[user.gender] || 'غير محدد';
        }

        // العمر
        const age = document.getElementById('info-age');
        if (age) {
            age.textContent = user.age ? `${user.age} سنة` : '-';
        }

        // الغرفة
        const room = document.getElementById('info-room');
        if (room) {
            const roomNames = {
                general: '🌎 العامة',
                yemen: '🇾🇪 اليمن',
                algeria: '🇩🇿 الجزائر',
                egypt: '🇪🇬 مصر',
                saudi: '🇸🇦 السعودية',
                uae: '🇦🇪 الإمارات'
            };
            room.textContent = roomNames[user.room] || 'غير متواجد';
        }

        // النبذة
        const bio = document.getElementById('info-bio');
        if (bio) {
            bio.textContent = user.bio || 'لم يتم كتابة نبذة بعد';
        }

        // آخر تواجد
        const lastSeen = document.getElementById('info-last-seen');
        if (lastSeen) {
            lastSeen.textContent = this.formatDateTime(user.lastSeen || new Date().toISOString());
        }

        // IP (للمالك فقط)
        const ip = document.getElementById('info-ip');
        if (ip) {
            ip.textContent = '***.***.***.***';
        }
    }

    // ===== عرض الأصدقاء =====
    renderFriends() {
        const container = document.getElementById('friends-list');
        const noFriends = document.getElementById('no-friends');
        const count = document.getElementById('friends-count');
        
        if (!container) return;

        const friends = this.viewedUser.friends || [];
        
        if (count) {
            count.textContent = `${friends.length} صديق`;
        }

        if (friends.length === 0) {
            container.innerHTML = '';
            if (noFriends) noFriends.style.display = 'block';
            return;
        }

        if (noFriends) noFriends.style.display = 'none';
        container.innerHTML = '';

        // أصدقاء تجريبيون
        const demoFriends = [
            { id: 'f1', name: 'خالد', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=khaled&backgroundColor=b6e3f4', status: 'متصل', roleEmoji: '💎' },
            { id: 'f2', name: 'نورة', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nora&backgroundColor=ffd5dc', status: 'متصل', roleEmoji: '🧑‍💼' },
            { id: 'f3', name: 'علي', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ali&backgroundColor=b6e3f4', status: 'غير متصل', roleEmoji: '👤' }
        ];

        demoFriends.forEach(friend => {
            const item = document.createElement('div');
            item.className = 'friend-item';
            item.innerHTML = `
                <img src="${friend.avatar}" alt="${friend.name}">
                <div class="friend-item-info">
                    <h4>${friend.roleEmoji} ${friend.name}</h4>
                    <span>${friend.status}</span>
                </div>
                <div class="friend-item-status" style="background: ${friend.status === 'متصل' ? 'var(--success)' : 'var(--text-muted)'}"></div>
            `;
            
            item.addEventListener('click', () => {
                window.location.href = `profile.html?user=${friend.id}`;
            });
            
            container.appendChild(item);
        });
    }

    // ===== تحديث واجهة الإدارة =====
    updateAdminUI() {
        if (!this.isAdmin) return;

        // إظهار بيانات IP والموقع للمالك فقط
        const adminOnlyRows = document.querySelectorAll('.admin-only-row');
        adminOnlyRows.forEach(row => {
            row.style.display = 'flex';
        });

        // إظهار سجل الكتم
        const historyList = document.getElementById('history-list');
        if (historyList) {
            historyList.innerHTML = `
                <div class="history-item">
                    <i class="fas fa-microphone-slash"></i>
                    <span class="history-reason">كتم عن الكتابة - سبب: إساءة</span>
                    <span class="history-date">2026/07/15</span>
                </div>
                <div class="history-item">
                    <i class="fas fa-user-times"></i>
                    <span class="history-reason">طرد من الغرفة - سبب: مخالفة</span>
                    <span class="history-date">2026/07/10</span>
                </div>
            `;
        }
    }

    // ===== اللايك =====
    likeUser() {
        if (this.isOwnProfile) return;
        
        this.viewedUser.likes = (this.viewedUser.likes || 0) + 1;
        
        const likesCount = document.getElementById('likes-count');
        if (likesCount) {
            likesCount.textContent = this.viewedUser.likes;
        }
        
        this.showToast(`تم إعجابك بـ ${this.viewedUser.name} ❤️`, 'success');
        
        // حفظ في التخزين المحلي
        const likedUsers = JSON.parse(localStorage.getItem('likedUsers') || '[]');
        if (!likedUsers.includes(this.viewedUser.id)) {
            likedUsers.push(this.viewedUser.id);
            localStorage.setItem('likedUsers', JSON.stringify(likedUsers));
        }
    }

    // ===== إضافة صديق =====
    addFriend() {
        if (this.isOwnProfile) return;
        
        this.showToast(`تم إرسال طلب صداقة لـ ${this.viewedUser.name}`, 'success');
        
        // حفظ الطلب
        const friendRequests = JSON.parse(localStorage.getItem('friendRequests') || '[]');
        friendRequests.push({
            from: this.currentUser.id,
            to: this.viewedUser.id,
            status: 'pending',
            date: new Date().toISOString()
        });
        localStorage.setItem('friendRequests', JSON.stringify(friendRequests));
    }

    // ===== فتح نافذة التعديل =====
    openEditModal() {
        if (!this.isOwnProfile) return;
        
        const popup = document.getElementById('edit-profile-popup');
        const overlay = document.getElementById('edit-profile-overlay');
        
        // تعبئة البيانات
        document.getElementById('edit-name').value = this.currentUser.name || '';
        document.getElementById('edit-status').value = this.currentUser.status || '';
        document.getElementById('edit-bio').value = this.currentUser.bio || '';
        document.getElementById('edit-privacy').value = this.currentUser.privateSetting || 'all';
        
        popup.classList.add('active');
        overlay.classList.add('active');
    }

    // ===== إغلاق نافذة التعديل =====
    closeEditModal() {
        document.getElementById('edit-profile-popup').classList.remove('active');
        document.getElementById('edit-profile-overlay').classList.remove('active');
    }

    // ===== حفظ التعديلات =====
    saveProfile() {
        const name = document.getElementById('edit-name').value.trim();
        const status = document.getElementById('edit-status').value.trim();
        const bio = document.getElementById('edit-bio').value.trim();
        const privacy = document.getElementById('edit-privacy').value;
        const currentPassword = document.getElementById('edit-current-password').value;
        const newPassword = document.getElementById('edit-new-password').value;
        const confirmPassword = document.getElementById('edit-confirm-password').value;
        
        if (name) {
            this.currentUser.name = name;
        }
        
        this.currentUser.status = status || 'متصل';
        this.currentUser.bio = bio;
        this.currentUser.privateSetting = privacy;
        
        // تغيير كلمة المرور
        if (newPassword) {
            if (newPassword.length < 6) {
                this.showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
                return;
            }
            if (newPassword !== confirmPassword) {
                this.showToast('كلمتا المرور غير متطابقتين', 'error');
                return;
            }
            this.currentUser.password = newPassword;
        }
        
        // حفظ
        localStorage.setItem('chatUser', JSON.stringify(this.currentUser));
        
        // تحديث قائمة المستخدمين المسجلين
        const storedUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        const userIndex = storedUsers.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
            storedUsers[userIndex] = this.currentUser;
            localStorage.setItem('registeredUsers', JSON.stringify(storedUsers));
        }
        
        this.closeEditModal();
        this.renderProfile();
        this.showToast('تم حفظ التغييرات بنجاح', 'success');
    }

    // ===== حذف الحساب =====
    deleteAccount() {
        if (!confirm('هل أنت متأكد من حذف حسابك؟ هذا الإجراء لا يمكن التراجع عنه!')) {
            return;
        }
        
        const password = prompt('أدخل كلمة المرور الحالية للتأكيد:');
        if (!password) return;
        
        // حذف من قائمة المستخدمين
        const storedUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
        const filteredUsers = storedUsers.filter(u => u.id !== this.currentUser.id);
        localStorage.setItem('registeredUsers', JSON.stringify(filteredUsers));
        
        // حذف بيانات الجلسة
        localStorage.removeItem('chatUser');
        localStorage.removeItem('chatToken');
        
        this.showToast('تم حذف الحساب بنجاح', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }

    // ===== عرض إجراءات الإدارة =====
    showAdminActions() {
        if (!this.isAdmin || this.isOwnProfile) return;
        
        const actions = ['كتم', 'طرد', 'حذف رسائل', 'تعديل اسم'];
        const action = prompt(`اختر إجراء لـ ${this.viewedUser.name}:\n1. كتم\n2. طرد\n3. حذف رسائل\n4. تعديل اسم`);
        
        if (action === '1' || action === 'كتم') {
            this.showToast(`تم كتم ${this.viewedUser.name} لمدة 5 دقائق`, 'warning');
        } else if (action === '2' || action === 'طرد') {
            this.showToast(`تم طرد ${this.viewedUser.name} من الغرفة`, 'warning');
        } else if (action === '3' || action === 'حذف') {
            this.showToast('تم حذف رسائل المستخدم', 'success');
        } else if (action === '4' || action === 'تعديل') {
            const newName = prompt('أدخل الاسم الجديد:', this.viewedUser.name);
            if (newName) {
                this.showToast(`تم تغيير الاسم إلى ${newName}`, 'success');
            }
        }
    }

    // ===== Toast =====
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
      