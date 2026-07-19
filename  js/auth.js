
# إنشاء ملف auth.js - نظام المصادقة والتسجيل
auth_js = '''// ========== نظام المصادقة - شات اليمن المطور ==========

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupTabs();
        this.setupGenderSelection();
        this.setupRandomAge();
        this.setupPasswordToggle();
        this.setupForms();
        this.checkExistingSession();
    }

    // ===== تبديل التبويبات =====
    setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                
                // إزالة النشاط من الكل
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                // تفعيل التبويب المحدد
                btn.classList.add('active');
                document.getElementById(`${tabId}-tab`).classList.add('active');
                
                // تأثير صوتي خفيف (اختياري)
                this.playSound('click');
            });
        });
    }

    // ===== اختيار الجنس =====
    setupGenderSelection() {
        document.querySelectorAll('.gender-select').forEach(container => {
            const hiddenInput = container.nextElementSibling;
            
            container.querySelectorAll('.gender-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    // إزالة التحديد من الكل
                    container.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('selected'));
                    
                    // تحديد الزر المختار
                    btn.classList.add('selected');
                    
                    // تحديث الحقل المخفي
                    if (hiddenInput && hiddenInput.tagName === 'INPUT') {
                        hiddenInput.value = btn.dataset.gender;
                    }
                    
                    // تأثير بصري
                    this.animateSelection(btn);
                });
            });
        });
    }

    // ===== زر العشوائي للعمر =====
    setupRandomAge() {
        const randomBtn = document.getElementById('random-age');
        const ageInput = document.getElementById('guest-age');
        
        if (randomBtn && ageInput) {
            randomBtn.addEventListener('click', () => {
                const randomAge = Math.floor(Math.random() * (99 - 20 + 1)) + 20;
                
                // تأثير العد التنازلي السريع
                let current = parseInt(ageInput.value) || 20;
                const interval = setInterval(() => {
                    current += Math.floor(Math.random() * 10) - 5;
                    if (current < 20) current = 20;
                    if (current > 99) current = 99;
                    ageInput.value = current;
                }, 50);
                
                setTimeout(() => {
                    clearInterval(interval);
                    ageInput.value = randomAge;
                    this.animateNumber(ageInput);
                }, 600);
            });
        }
    }

    // ===== إظهار/إخفاء كلمة المرور =====
    setupPasswordToggle() {
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = btn.previousElementSibling;
                const icon = btn.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
    }

    // ===== إعداد النماذج =====
    setupForms() {
        // نموذج دخول الزوار
        const guestForm = document.getElementById('guest-form');
        if (guestForm) {
            guestForm.addEventListener('submit', (e) => this.handleGuestLogin(e));
        }

        // نموذج دخول الأعضاء
        const memberForm = document.getElementById('member-form');
        if (memberForm) {
            memberForm.addEventListener('submit', (e) => this.handleMemberLogin(e));
        }

        // نموذج التسجيل
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
    }

    // ===== معالجة دخول الزوار =====
    async handleGuestLogin(e) {
        e.preventDefault();
        
        const name = document.getElementById('guest-name').value.trim();
        const gender = document.getElementById('guest-gender').value;
        const age = document.getElementById('guest-age').value;
        
        // التحقق من البيانات
        if (!name) {
            this.showToast('الرجاء إدخال اسمك', 'error');
            document.getElementById('guest-name').focus();
            return;
        }
        
        if (!gender) {
            this.showToast('الرجاء اختيار الجنس', 'error');
            return;
        }
        
        if (!age || age < 20 || age > 99) {
            this.showToast('الرجاء إدخال عمر صحيح (20-99)', 'error');
            return;
        }
        
        this.showLoading(true);
        
        try {
            // إنشاء معرف فريد للزائر
            const guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            const guestUser = {
                id: guestId,
                name: name,
                username: name,
                gender: gender,
                age: parseInt(age),
                role: 'guest',
                roleEmoji: '👤',
                roleName: 'زائر',
                avatar: this.getDefaultAvatar(gender),
                country: 'YE',
                countryFlag: '🇾🇪',
                status: 'متصل',
                balance: 0,
                isOnline: true,
                joinedAt: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                canSendImages: false,
                canSendVoice: true,
                canChangeAvatar: false,
                canChangeNameColor: false,
                privateSetting: 'all',
                likes: 0,
                friends: [],
                room: null
            };
            
            // حفظ في التخزين المحلي
            localStorage.setItem('chatUser', JSON.stringify(guestUser));
            localStorage.setItem('chatToken', guestId);
            
            // محاكاة تأخير الشبكة
            await this.simulateNetworkDelay(800);
            
            this.showToast(`أهلاً وسهلاً ${name}!`, 'success');
            
            // الانتقال لصفحة الغرف
            setTimeout(() => {
                window.location.href = 'rooms.html';
            }, 1000);
            
        } catch (error) {
            console.error('Guest login error:', error);
            this.showToast('حدث خطأ، يرجى المحاولة مرة أخرى', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // ===== معالجة دخول الأعضاء =====
    async handleMemberLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('member-username').value.trim();
        const password = document.getElementById('member-password').value;
        
        if (!username || !password) {
            this.showToast('الرجاء إدخال اسم المستخدم وكلمة المرور', 'error');
            return;
        }
        
        this.showLoading(true);
        
        try {
            // في الواقع، هنا نرسل طلب للسيرفر
            // للعرض التوضيحي، نستخدم بيانات محلية
            await this.simulateNetworkDelay(1000);
            
            // التحقق من المستخدم المخزن محلياً (للعرض)
            const storedUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
            const user = storedUsers.find(u => u.username === username && u.password === password);
            
            if (!user) {
                // للعرض التوضيحي - إنشاء مستخدم تجريبي
                const demoUser = this.createDemoUser(username);
                localStorage.setItem('chatUser', JSON.stringify(demoUser));
                localStorage.setItem('chatToken', demoUser.id);
                
                this.showToast(`مرحباً بعودتك ${username}!`, 'success');
                setTimeout(() => {
                    window.location.href = 'rooms.html';
                }, 1000);
                return;
            }
            
            user.isOnline = true;
            user.lastSeen = new Date().toISOString();
            
            localStorage.setItem('chatUser', JSON.stringify(user));
            localStorage.setItem('chatToken', user.id);
            
            this.showToast(`مرحباً بعودتك ${user.name}!`, 'success');
            
            setTimeout(() => {
                window.location.href = 'rooms.html';
            }, 1000);
            
        } catch (error) {
            console.error('Member login error:', error);
            this.showToast('حدث خطأ في تسجيل الدخول', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // ===== معالجة التسجيل =====
    async handleRegister(e) {
        e.preventDefault();
        
        const name = document.getElementById('reg-name').value.trim();
        const username = document.getElementById('reg-username').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm').value;
        const gender = document.getElementById('reg-gender').value;
        const age = document.getElementById('reg-age').value;
        const country = document.getElementById('reg-country').value;
        const agreeTerms = document.getElementById('agree-terms').checked;
        
        // التحقق من البيانات
        if (!name || !username || !password) {
            this.showToast('الرجاء ملء جميع الحقول المطلوبة', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showToast('كلمتا المرور غير متطابقتين', 'error');
            return;
        }
        
        if (!gender) {
            this.showToast('الرجاء اختيار الجنس', 'error');
            return;
        }
        
        if (!age || age < 13) {
            this.showToast('يجب أن يكون العمر 13 سنة على الأقل', 'error');
            return;
        }
        
        if (!country) {
            this.showToast('الرجاء اختيار البلد', 'error');
            return;
        }
        
        if (!agreeTerms) {
            this.showToast('يجب الموافقة على شروط الاستخدام', 'error');
            return;
        }
        
        this.showLoading(true);
        
        try {
            await this.simulateNetworkDelay(1200);
            
            // التحقق من عدم تكرار اسم المستخدم
            const storedUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
            if (storedUsers.find(u => u.username === username)) {
                this.showToast('اسم المستخدم مستخدم بالفعل', 'error');
                this.showLoading(false);
                return;
            }
            
            const countryData = this.getCountryData(country);
            
            const newUser = {
                id: 'user_' + Date.now(),
                name: name,
                username: username,
                email: email || `${username}@temp.com`,
                gender: gender,
                age: parseInt(age),
                country: country,
                countryFlag: countryData.flag,
                countryName: countryData.name,
                role: 'member',
                roleEmoji: '🧑‍💼',
                roleName: 'عضو',
                avatar: this.getDefaultAvatar(gender),
                status: 'متصل',
                balance: 100, // رصيد ابتدائي
                isOnline: true,
                joinedAt: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                canSendImages: false,
                canSendVoice: true,
                canChangeAvatar: false,
                canChangeNameColor: false,
                privateSetting: 'all',
                likes: 0,
                friends: [],
                room: null,
                password: password // في الواقع نخزن hash فقط
            };
            
            // حفظ المستخدم
            storedUsers.push(newUser);
            localStorage.setItem('registeredUsers', JSON.stringify(storedUsers));
            localStorage.setItem('chatUser', JSON.stringify(newUser));
            localStorage.setItem('chatToken', newUser.id);
            
            this.showToast('تم إنشاء الحساب بنجاح! 🎉', 'success');
            
            setTimeout(() => {
                window.location.href = 'rooms.html';
            }, 1500);
            
        } catch (error) {
            console.error('Registration error:', error);
            this.showToast('حدث خطأ في إنشاء الحساب', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // ===== التحقق من الجلسة الموجودة =====
    checkExistingSession() {
        const token = localStorage.getItem('chatToken');
        const user = localStorage.getItem('chatUser');
        
        if (token && user) {
            // يمكن إضافة تحقق من صلاحية التوكن هنا
            // للعرض التوضيحي نترك المستخدم في صفحة الدخول
        }
    }

    // ===== دوال مساعدة =====
    getDefaultAvatar(gender) {
        const avatars = {
            male: 'https://api.dicebear.com/7.x/avataaars/svg?seed=male&backgroundColor=b6e3f4',
            female: 'https://api.dicebear.com/7.x/avataaars/svg?seed=female&backgroundColor=ffd5dc',
            other: 'https://api.dicebear.com/7.x/avataaars/svg?seed=other&backgroundColor=c0aede'
        };
        return avatars[gender] || avatars.other;
    }

    getCountryData(code) {
        const countries = {
            'YE': { name: 'اليمن', flag: '🇾🇪' },
            'SA': { name: 'السعودية', flag: '🇸🇦' },
            'AE': { name: 'الإمارات', flag: '🇦🇪' },
            'QA': { name: 'قطر', flag: '🇶🇦' },
            'KW': { name: 'الكويت', flag: '🇰🇼' },
            'BH': { name: 'البحرين', flag: '🇧🇭' },
            'OM': { name: 'عمان', flag: '🇴🇲' },
            'IQ': { name: 'العراق', flag: '🇮🇶' },
            'JO': { name: 'الأردن', flag: '🇯🇴' },
            'SY': { name: 'سوريا', flag: '🇸🇾' },
            'LB': { name: 'لبنان', flag: '🇱🇧' },
            'PS': { name: 'فلسطين', flag: '🇵🇸' },
            'EG': { name: 'مصر', flag: '🇪🇬' },
            'DZ': { name: 'الجزائر', flag: '🇩🇿' },
            'MA': { name: 'المغرب', flag: '🇲🇦' },
            'TN': { name: 'تونس', flag: '🇹🇳' },
            'LY': { name: 'ليبيا', flag: '🇱🇾' },
            'SD': { name: 'السودان', flag: '🇸🇩' },
            'OTHER': { name: 'دولة أخرى', flag: '🌍' }
        };
        return countries[code] || countries['OTHER'];
    }

    createDemoUser(username) {
        return {
            id: 'user_' + Date.now(),
            name: username,
            username: username,
            email: `${username}@demo.com`,
            gender: 'male',
            age: 25,
            country: 'YE',
            countryFlag: '🇾🇪',
            countryName: 'اليمن',
            role: 'member',
            roleEmoji: '🧑‍💼',
            roleName: 'عضو',
            avatar: this.getDefaultAvatar('male'),
            status: 'متصل',
            balance: 500,
            isOnline: true,
            joinedAt: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            canSendImages: false,
            canSendVoice: true,
            canChangeAvatar: false,
            canChangeNameColor: false,
            privateSetting: 'all',
            likes: 0,
            friends: [],
            room: null
        };
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
        
        setTimeout(() => {
            toast.remove();
        }, 3500);
    }

    // ===== Loading Overlay =====
    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.toggle('active', show);
        }
    }

    // ===== محاكاة تأخير الشبكة =====
    simulateNetworkDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ===== تأثيرات بصرية =====
    animateSelection(element) {
        element.style.transform = 'scale(0.95)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 150);
    }

    animateNumber(element) {
        element.style.transform = 'scale(1.2)';
        element.style.color = 'var(--accent)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
            element.style.color = '';
        }, 300);
    }

    playSound(type) {
        // يمكن إضافة أصوات هنا
        // const audio = new Audio(`assets/audio/${type}.mp3`);
        // audio.play().catch(() => {});
    }
}

// ===== تهيئة النظام =====
document.addEventListener('DOMContentLoaded', () => {
    window.authSystem = new AuthSystem();
});
'''

with open("/mnt/agents/output/chat-yemen/js/auth.js", "w", encoding="utf-8") as f:
    f.write(auth_js)
    
print("✅ تم إنشاء js/auth.js")