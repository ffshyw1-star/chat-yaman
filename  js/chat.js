
# إنشاء ملف chat.js - نظام الدردشة الكامل
chat_js = '''// ========== نظام الدردشة - شات اليمن المطور ==========

class ChatSystem {
    constructor() {
        this.currentUser = null;
        this.currentRoom = 'general';
        this.roomData = {
            general: { name: 'غرفة العامة', icon: '🌎' },
            yemen: { name: 'غرفة اليمن', icon: '🇾🇪' },
            algeria: { name: 'غرفة الجزائر', icon: '🇩🇿' },
            egypt: { name: 'غرفة مصر', icon: '🇪🇬' },
            saudi: { name: 'غرفة السعودية', icon: '🇸🇦' },
            uae: { name: 'غرفة الإمارات', icon: '🇦🇪' }
        };
        this.users = [];
        this.messages = [];
        this.selectedUser = null;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordingTimer = null;
        this.recordingSeconds = 0;
        this.typingTimeout = null;
        this.isAdmin = false;
        this.canSendImages = false;
        
        this.init();
    }

    init() {
        this.loadUser();
        this.loadRoom();
        this.setupEventListeners();
        this.generateDemoUsers();
        this.generateDemoMessages();
        this.renderMessages();
        this.renderUsersList();
        this.updateUI();
        this.startRealtimeSimulation();
        this.scrollToBottom();
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
            
            // تحديد الصلاحيات
            const role = this.currentUser.role || 'guest';
            this.isAdmin = ['admin', 'owner', 'moderator', 'management'].includes(role);
            this.canSendImages = ['premium', 'moderator', 'admin', 'owner', 'management'].includes(role);
            
        } catch (error) {
            console.error('Error loading user:', error);
            window.location.href = 'index.html';
        }
    }

    // ===== تحميل الغرفة =====
    loadRoom() {
        const urlParams = new URLSearchParams(window.location.search);
        const room = urlParams.get('room');
        if (room && this.roomData[room]) {
            this.currentRoom = room;
        }
        
        // تحديث عنوان الصفحة
        const roomInfo = this.roomData[this.currentRoom];
        document.title = `${roomInfo.name} - شات اليمن المطور 🌙`;
        
        // تحديث واجهة الغرفة
        const roomIcon = document.getElementById('room-icon');
        const roomName = document.getElementById('room-name');
        const bottomRoomName = document.getElementById('bottom-room-name');
        
        if (roomIcon) roomIcon.textContent = roomInfo.icon;
        if (roomName) roomName.textContent = roomInfo.name;
        if (bottomRoomName) bottomRoomName.textContent = roomInfo.name;
    }

    // ===== إعداد مستمعي الأحداث =====
    setupEventListeners() {
        // إرسال رسالة
        const sendBtn = document.getElementById('send-btn');
        const messageInput = document.getElementById('message-input');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }
        
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
            
            // النقر على اسم في الدردشة
            messageInput.addEventListener('click', () => {
                // إذا كان هناك اسم محدد، نضيفه
                if (this.selectedUser) {
                    messageInput.value = this.selectedUser + ' ';
                    messageInput.focus();
                    this.selectedUser = null;
                }
            });
        }

        // القائمة الجانبية
        const menuBtn = document.getElementById('menu-btn');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        const closeSidebar = document.getElementById('close-sidebar');
        
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                sidebar.classList.add('active');
                sidebarOverlay.classList.add('active');
            });
        }
        
        if (closeSidebar) {
            closeSidebar.addEventListener('click', () => this.closeSidebar());
        }
        
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => this.closeSidebar());
        }

        // المتجر
        const storeBtn = document.getElementById('store-btn');
        const storePopup = document.getElementById('store-popup');
        const storeOverlay = document.getElementById('store-overlay');
        const closeStore = document.getElementById('close-store');
        
        if (storeBtn) {
            storeBtn.addEventListener('click', () => {
                storePopup.classList.add('active');
                storeOverlay.classList.add('active');
            });
        }
        
        if (closeStore) {
            closeStore.addEventListener('click', () => this.closeStore());
        }
        
        if (storeOverlay) {
            storeOverlay.addEventListener('click', () => this.closeStore());
        }

        // الخاص
        const privateBtn = document.getElementById('private-btn');
        const privatePopup = document.getElementById('private-popup');
        const privateOverlay = document.getElementById('private-overlay');
        const closePrivate = document.getElementById('close-private');
        
        if (privateBtn) {
            privateBtn.addEventListener('click', () => {
                privatePopup.classList.add('active');
                privateOverlay.classList.add('active');
                this.renderPrivateList();
            });
        }
        
        if (closePrivate) {
            closePrivate.addEventListener('click', () => this.closePrivate());
        }
        
        if (privateOverlay) {
            privateOverlay.addEventListener('click', () => this.closePrivate());
        }

        // قائمة المتواجدين
        const usersListBtn = document.getElementById('users-list-btn');
        const usersPanel = document.getElementById('users-panel');
        const usersPanelOverlay = document.getElementById('users-panel-overlay');
        const closeUsersPanel = document.getElementById('close-users-panel');
        
        if (usersListBtn) {
            usersListBtn.addEventListener('click', () => {
                usersPanel.classList.add('active');
                usersPanelOverlay.classList.add('active');
            });
        }
        
        if (closeUsersPanel) {
            closeUsersPanel.addEventListener('click', () => this.closeUsersPanel());
        }
        
        if (usersPanelOverlay) {
            usersPanelOverlay.addEventListener('click', () => this.closeUsersPanel());
        }

        // الغرف
        const roomsListBtn = document.getElementById('rooms-list-btn');
        if (roomsListBtn) {
            roomsListBtn.addEventListener('click', () => {
                window.location.href = 'rooms.html';
            });
        }

        // الإعدادات
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                window.location.href = 'profile.html';
            });
        }

        // الصوت
        const soundBtn = document.getElementById('sound-btn');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                const icon = soundBtn.querySelector('i');
                if (icon.classList.contains('fa-volume-up')) {
                    icon.classList.remove('fa-volume-up');
                    icon.classList.add('fa-volume-mute');
                    this.showToast('الصوت مكتوم', 'info');
                } else {
                    icon.classList.remove('fa-volume-mute');
                    icon.classList.add('fa-volume-up');
                    this.showToast('الصوت مفعل', 'info');
                }
            });
        }

        // تسجيل صوتي
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => this.toggleRecording());
        }
        
        const stopRecording = document.getElementById('stop-recording');
        if (stopRecording) {
            stopRecording.addEventListener('click', () => this.stopRecording());
        }
        
        const cancelRecording = document.getElementById('cancel-recording');
        if (cancelRecording) {
            cancelRecording.addEventListener('click', () => this.cancelRecording());
        }

        // إيموجي
        const emojiBtn = document.getElementById('emoji-btn');
        if (emojiBtn) {
            emojiBtn.addEventListener('click', () => {
                const emojis = ['😀', '😂', '😍', '😢', '😡', '👍', '👎', '❤️', '🔥', '🎉', '🤔', '😴', '😎', '🤗', '😱', '🤝'];
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                const input = document.getElementById('message-input');
                if (input) {
                    input.value += randomEmoji;
                    input.focus();
                }
            });
        }

        // إرفاق (للمميز فما فوق)
        const attachBtn = document.getElementById('attach-btn');
        if (attachBtn && this.canSendImages) {
            attachBtn.style.display = 'flex';
            attachBtn.addEventListener('click', () => {
                this.showToast('رفع الصور متاح للمميزين فما فوق', 'info');
            });
        }

        // الملف الشخصي
        const profileBtn = document.getElementById('profile-btn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                window.location.href = 'profile.html';
            });
        }

        // إغلاق النوافذ المنبثقة
        const profilePopupOverlay = document.getElementById('profile-popup-overlay');
        if (profilePopupOverlay) {
            profilePopupOverlay.addEventListener('click', () => this.closeProfilePopup());
        }
        
        const closeProfilePopup = document.getElementById('close-profile-popup');
        if (closeProfilePopup) {
            closeProfilePopup.addEventListener('click', () => this.closeProfilePopup());
        }

        const adminPopupOverlay = document.getElementById('admin-popup-overlay');
        if (adminPopupOverlay) {
            adminPopupOverlay.addEventListener('click', () => this.closeAdminPopup());
        }
        
        const closeAdminPopup = document.getElementById('close-admin-popup');
        if (closeAdminPopup) {
            closeAdminPopup.addEventListener('click', () => this.closeAdminPopup());
        }

        const reportOverlay = document.getElementById('report-overlay');
        if (reportOverlay) {
            reportOverlay.addEventListener('click', () => this.closeReport());
        }
        
        const closeReport = document.getElementById('close-report');
        if (closeReport) {
            closeReport.addEventListener('click', () => this.closeReport());
        }

        // أزرار الأوامر الإدارية
        document.querySelectorAll('.admin-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.executeAdminAction(action);
            });
        });

        // أزرار الإبلاغ
        document.querySelectorAll('.report-reason').forEach(btn => {
            btn.addEventListener('click', () => {
                const reason = btn.dataset.reason;
                this.submitReport(reason);
            });
        });

        // شراء من المتجر
        document.querySelectorAll('.store-buy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = btn.dataset.item;
                const price = parseInt(btn.dataset.price);
                this.buyItem(item, price);
            });
        });

        // خروج من القائمة الجانبية
        const logoutSidebar = document.getElementById('logout-sidebar');
        if (logoutSidebar) {
            logoutSidebar.addEventListener('click', () => this.logout());
        }

        // إغلاق نافذة الخاص
        const closePrivateChat = document.getElementById('close-private-chat');
        if (closePrivateChat) {
            closePrivateChat.addEventListener('click', () => this.closePrivateChat());
        }
        
        const privateChatOverlay = document.getElementById('private-chat-overlay');
        if (privateChatOverlay) {
            privateChatOverlay.addEventListener('click', () => this.closePrivateChat());
        }

        // إرسال رسالة خاصة
        const privateSendBtn = document.getElementById('private-send-btn');
        if (privateSendBtn) {
            privateSendBtn.addEventListener('click', () => this.sendPrivateMessage());
        }
        
        const privateMessageInput = document.getElementById('private-message-input');
        if (privateMessageInput) {
            privateMessageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendPrivateMessage();
            });
        }
    }

    // ===== إغلاق النوافذ =====
    closeSidebar() {
        document.getElementById('sidebar').classList.remove('active');
        document.getElementById('sidebar-overlay').classList.remove('active');
    }

    closeStore() {
        document.getElementById('store-popup').classList.remove('active');
        document.getElementById('store-overlay').classList.remove('active');
    }

    closePrivate() {
        document.getElementById('private-popup').classList.remove('active');
        document.getElementById('private-overlay').classList.remove('active');
    }

    closeUsersPanel() {
        document.getElementById('users-panel').classList.remove('active');
        document.getElementById('users-panel-overlay').classList.remove('active');
    }

    closeProfilePopup() {
        document.getElementById('profile-popup').classList.remove('active');
        document.getElementById('profile-popup-overlay').classList.remove('active');
    }

    closeAdminPopup() {
        document.getElementById('admin-popup').classList.remove('active');
        document.getElementById('admin-popup-overlay').classList.remove('active');
    }

    closeReport() {
        document.getElementById('report-popup').classList.remove('active');
        document.getElementById('report-overlay').classList.remove('active');
    }

    closePrivateChat() {
        document.getElementById('private-chat-window').classList.remove('active');
        document.getElementById('private-chat-overlay').classList.remove('active');
    }

    // ===== إرسال رسالة =====
    sendMessage() {
        const input = document.getElementById('message-input');
        const text = input.value.trim();
        
        if (!text) return;
        
        const message = {
            id: Date.now(),
            type: 'text',
            text: text,
            author: this.currentUser.name,
            authorId: this.currentUser.id,
            avatar: this.currentUser.avatar,
            role: this.currentUser.role,
            roleEmoji: this.currentUser.roleEmoji,
            roleName: this.currentUser.roleName,
            timestamp: new Date().toISOString(),
            room: this.currentRoom,
            isOwn: true
        };
        
        this.messages.push(message);
        this.renderMessage(message);
        this.scrollToBottom();
        
        input.value = '';
        
        // محاكاة رد
        setTimeout(() => this.simulateReply(), 2000 + Math.random() * 3000);
    }

    // ===== عرض الرسائل =====
    renderMessages() {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        
        container.innerHTML = '';
        this.messages.forEach(msg => this.renderMessage(msg));
    }

    renderMessage(msg) {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        
        const messageEl = document.createElement('div');
        messageEl.className = `message ${msg.isOwn ? 'own' : ''} ${msg.type === 'system' ? 'system' : ''}`;
        messageEl.dataset.id = msg.id;
        
        if (msg.type === 'system') {
            messageEl.innerHTML = `
                <div class="system-message">
                    <span class="system-icon">🎉</span>
                    ${msg.text}
                </div>
            `;
        } else if (msg.type === 'voice') {
            messageEl.innerHTML = `
                <img src="${msg.avatar}" alt="${msg.author}" class="message-avatar" onclick="chatSystem.showUserProfile('${msg.authorId}')">
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-author role-${msg.role}" onclick="chatSystem.selectUserName('${msg.author}')">${msg.author}</span>
                        ${msg.role !== 'guest' && msg.role !== 'member' ? `<span class="message-badge ${msg.role}">${msg.roleName}</span>` : ''}
                        <span class="message-time">${this.formatTime(msg.timestamp)}</span>
                    </div>
                    <div class="message-body">
                        <div class="voice-message">
                            <button class="voice-play-btn"><i class="fas fa-play"></i></button>
                            <div class="voice-wave">
                                <span></span><span></span><span></span><span></span><span></span>
                            </div>
                            <span class="voice-duration">${msg.duration || '0:05'}</span>
                        </div>
                    </div>
                    <div class="message-actions">
                        <button class="message-action-btn" onclick="chatSystem.likeMessage(${msg.id})"><i class="fas fa-heart"></i></button>
                        <button class="message-action-btn report" onclick="chatSystem.reportMessage(${msg.id})"><i class="fas fa-flag"></i> إبلاغ</button>
                    </div>
                </div>
            `;
        } else {
            messageEl.innerHTML = `
                <img src="${msg.avatar}" alt="${msg.author}" class="message-avatar" onclick="chatSystem.showUserProfile('${msg.authorId}')">
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-author role-${msg.role}" onclick="chatSystem.selectUserName('${msg.author}')">${msg.author}</span>
                        ${msg.role !== 'guest' && msg.role !== 'member' ? `<span class="message-badge ${msg.role}">${msg.roleName}</span>` : ''}
                        <span class="message-time">${this.formatTime(msg.timestamp)}</span>
                    </div>
                    <div class="message-body">${this.escapeHtml(msg.text)}</div>
                    <div class="message-actions">
                        <button class="message-action-btn" onclick="chatSystem.likeMessage(${msg.id})"><i class="fas fa-heart"></i></button>
                        <button class="message-action-btn report" onclick="chatSystem.reportMessage(${msg.id})"><i class="fas fa-flag"></i> إبلاغ</button>
                    </div>
                </div>
            `;
        }
        
        container.appendChild(messageEl);
        this.scrollToBottom();
    }

    // ===== توليد مستخدمين تجريبيين =====
    generateDemoUsers() {
        const demoUsers = [
            { id: 'u1', name: 'أحمد', username: 'ahmed', gender