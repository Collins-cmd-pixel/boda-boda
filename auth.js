// Authentication and user management

// User session management
const SessionManager = {
    // Current user data
    currentUser: null,

    // Initialize session
    init() {
        const savedUser = localStorage.getItem('bodaSaccoUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.updateAuthUI();
        }
        this.checkAuthState();
    },

    // Login user
    async login(phone, pin) {
        try {
            // For demo - check if user exists in localStorage
            const users = JSON.parse(localStorage.getItem('bodaSaccoUsers') || '[]');
            const user = users.find(u => u.phone === phone && u.pin === pin);

            if (user) {
                this.currentUser = user;
                localStorage.setItem('bodaSaccoUser', JSON.stringify(user));
                this.updateAuthUI();
                
                // Redirect to dashboard
                window.location.href = 'dashboard.html';
                return { success: true };
            } else {
                // Demo mode - create default user if none exists
                if (users.length === 0) {
                    const defaultUser = {
                        id: Date.now(),
                        name: 'John Kamau',
                        phone: phone,
                        pin: pin,
                        sacco: 'Kawangware Boda',
                        role: 'rider',
                        joinedDate: new Date().toISOString()
                    };
                    
                    users.push(defaultUser);
                    localStorage.setItem('bodaSaccoUsers', JSON.stringify(users));
                    localStorage.setItem('bodaSaccoUser', JSON.stringify(defaultUser));
                    
                    this.currentUser = defaultUser;
                    window.location.href = 'dashboard.html';
                    return { success: true };
                }
                
                return { success: false, error: 'Invalid phone number or PIN' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Login failed. Please try again.' };
        }
    },

    // Register new user
    async register(userData) {
        try {
            const users = JSON.parse(localStorage.getItem('bodaSaccoUsers') || '[]');
            
            // Check if phone already exists
            if (users.some(u => u.phone === userData.phone)) {
                return { success: false, error: 'Phone number already registered' };
            }

            // Create new user
            const newUser = {
                id: Date.now(),
                ...userData,
                role: 'rider',
                joinedDate: new Date().toISOString(),
                stats: {
                    totalEarnings: 0,
                    totalTrips: 0,
                    loanBalance: 0,
                    savings: 0
                }
            };

            users.push(newUser);
            localStorage.setItem('bodaSaccoUsers', JSON.stringify(users));
            
            // Auto login
            this.currentUser = newUser;
            localStorage.setItem('bodaSaccoUser', JSON.stringify(newUser));
            
            window.location.href = 'dashboard.html';
            return { success: true };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: 'Registration failed. Please try again.' };
        }
    },

    // Logout user
    logout() {
        this.currentUser = null;
        localStorage.removeItem('bodaSaccoUser');
        window.location.href = 'index.html';
    },

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.currentUser || !!localStorage.getItem('bodaSaccoUser');
    },

    // Get current user
    getUser() {
        if (this.currentUser) return this.currentUser;
        
        const saved = localStorage.getItem('bodaSaccoUser');
        if (saved) {
            this.currentUser = JSON.parse(saved);
            return this.currentUser;
        }
        
        return null;
    },

    // Update user profile
    async updateProfile(updates) {
        const user = this.getUser();
        if (!user) return { success: false, error: 'Not logged in' };

        const users = JSON.parse(localStorage.getItem('bodaSaccoUsers') || '[]');
        const index = users.findIndex(u => u.id === user.id);
        
        if (index !== -1) {
            users[index] = { ...users[index], ...updates };
            localStorage.setItem('bodaSaccoUsers', JSON.stringify(users));
            
            this.currentUser = users[index];
            localStorage.setItem('bodaSaccoUser', JSON.stringify(users[index]));
            
            return { success: true };
        }
        
        return { success: false, error: 'User not found' };
    },

    // Update auth UI based on state
    updateAuthUI() {
        const user = this.getUser();
        if (!user) return;

        // Update user name elements
        document.querySelectorAll('[data-user-name]').forEach(el => {
            el.textContent = user.name.split(' ')[0];
        });

        // Update SACCO name elements
        document.querySelectorAll('[data-sacco-name]').forEach(el => {
            el.textContent = user.sacco;
        });

        // Update profile links
        document.querySelectorAll('[data-user-phone]').forEach(el => {
            el.textContent = user.phone;
        });
    },

    // Check auth state on page load
    checkAuthState() {
        const protectedPages = ['dashboard.html', 'earnings.html', 'loans.html', 'members.html', 'add-earning.html'];
        const currentPage = window.location.pathname.split('/').pop();

        if (protectedPages.includes(currentPage)) {
            if (!this.isAuthenticated()) {
                window.location.href = 'index.html';
            }
        }

        if (currentPage === 'index.html' && this.isAuthenticated()) {
            window.location.href = 'dashboard.html';
        }
    }
};

// Initialize session on load
document.addEventListener('DOMContentLoaded', () => {
    SessionManager.init();

    // Setup login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const phone = document.getElementById('loginPhone').value;
            const pin = document.getElementById('loginPin').value;
            
            const result = await SessionManager.login(phone, pin);
            
            if (!result.success) {
                alert(result.error);
            }
        });
    }

    // Setup signup form handler
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('signupName').value;
            const phone = document.getElementById('signupPhone').value;
            const sacco = document.getElementById('saccoName').value;
            const pin = document.getElementById('signupPin').value;
            const confirmPin = document.getElementById('confirmPin').value;

            if (pin !== confirmPin) {
                alert('PINs do not match');
                return;
            }

            const result = await SessionManager.register({
                name,
                phone,
                sacco,
                pin
            });

            if (!result.success) {
                alert(result.error);
            }
        });
    }

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            SessionManager.logout();
        });
    }
});

// Export for use in other files
window.SessionManager = SessionManager;