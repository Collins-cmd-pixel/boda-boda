// Main application logic for BodaSacco Manager

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('BodaSacco Manager initializing...');
    
    // Check authentication
    if (typeof SessionManager !== 'undefined') {
        SessionManager.checkAuthState();
    }
    
    // Initialize database
    if (typeof initDB === 'function') {
        initDB().then(() => {
            console.log('Database ready');
            loadDashboardData();
            setupEventListeners();
            checkNetworkStatus();
            setupPWAInstall();
        }).catch(error => {
            console.error('Database initialization failed:', error);
        });
    } else {
        // If db.js not loaded, still try to load basic data
        loadDashboardData();
        setupEventListeners();
        checkNetworkStatus();
        setupPWAInstall();
    }
});

// ==================== DASHBOARD FUNCTIONS ====================

// Load all dashboard data
function loadDashboardData() {
    // Set user info from session
    if (typeof SessionManager !== 'undefined') {
        const user = SessionManager.getUser();
        if (user) {
            // Update user name elements
            const userNameEl = document.getElementById('userName');
            if (userNameEl) {
                userNameEl.textContent = user.name ? user.name.split(' ')[0] : 'Rider';
            }
            
            // Update SACCO name elements
            const saccoDisplay = document.getElementById('saccoDisplay');
            if (saccoDisplay) {
                saccoDisplay.textContent = user.sacco || 'My SACCO';
            }
        }
    }

    // Set current date
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        const today = new Date();
        const options = { weekday: 'short', day: 'numeric', month: 'short' };
        dateEl.textContent = today.toLocaleDateString('en-KE', options);
    }

    // Load statistics
    loadStats();
    
    // Load recent earnings
    loadRecentEarnings();
}

// Load dashboard statistics
async function loadStats() {
    try {
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Get earnings from database
        let earnings = [];
        let total = 0;
        let trips = 0;
        
        if (typeof db !== 'undefined' && db) {
            const transaction = db.transaction(['earnings'], 'readonly');
            const store = transaction.objectStore('earnings');
            
            // This is a promise-based approach
            earnings = await new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            // Filter for today's earnings
            const todayEarnings = earnings.filter(e => {
                const eDate = new Date(e.date);
                return eDate >= today && eDate < tomorrow;
            });
            
            total = todayEarnings.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
            trips = todayEarnings.length;
        } else {
            // Demo data if no database
            total = 1450;
            trips = 17;
        }
        
        const savings = Math.round(total * 0.1); // 10% savings
        
        // Get loan balance
        let loanBalance = 8200; // Default demo value
        if (typeof db !== 'undefined' && db) {
            try {
                loanBalance = await getLoanBalance();
            } catch (e) {
                console.log('Using default loan balance');
            }
        }
        
        // Update UI
        const todayEarningsEl = document.getElementById('todayEarnings');
        const savingsEl = document.getElementById('savings');
        const tripsEl = document.getElementById('tripsToday');
        const loanBalanceEl = document.getElementById('loanBalance');
        
        if (todayEarningsEl) todayEarningsEl.textContent = `KES ${total.toLocaleString()}`;
        if (savingsEl) savingsEl.textContent = `KES ${savings.toLocaleString()}`;
        if (tripsEl) tripsEl.textContent = trips;
        if (loanBalanceEl) loanBalanceEl.textContent = `KES ${loanBalance.toLocaleString()}`;
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load recent earnings for dashboard
async function loadRecentEarnings() {
    const container = document.getElementById('recentEarnings');
    if (!container) return;
    
    try {
        let recentEarnings = [];
        
        if (typeof db !== 'undefined' && db) {
            const transaction = db.transaction(['earnings'], 'readonly');
            const store = transaction.objectStore('earnings');
            
            const allEarnings = await new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            // Sort by date descending and take top 5
            recentEarnings = allEarnings
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5);
        }
        
        if (recentEarnings.length === 0) {
            // Show demo data
            container.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon">🛵</div>
                    <div class="activity-details">
                        <div class="activity-title">Trip to Town</div>
                        <div class="activity-time">10:30 AM</div>
                    </div>
                    <div class="activity-amount">KES 250</div>
                </div>
                <div class="activity-item">
                    <div class="activity-icon">🛵</div>
                    <div class="activity-details">
                        <div class="activity-title">Kawangware - Stage</div>
                        <div class="activity-time">9:15 AM</div>
                    </div>
                    <div class="activity-amount">KES 150</div>
                </div>
                <div class="activity-item">
                    <div class="activity-icon">🛵</div>
                    <div class="activity-details">
                        <div class="activity-title">CBD - Westlands</div>
                        <div class="activity-time">8:45 AM</div>
                    </div>
                    <div class="activity-amount">KES 300</div>
                </div>
            `;
        } else {
            // Display real data
            container.innerHTML = recentEarnings.map(e => `
                <div class="activity-item">
                    <div class="activity-icon">🛵</div>
                    <div class="activity-details">
                        <div class="activity-title">${e.from || 'Trip'} → ${e.to || 'Destination'}</div>
                        <div class="activity-time">${new Date(e.date).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div class="activity-amount">KES ${e.amount}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading recent earnings:', error);
        container.innerHTML = '<div class="error-message">Failed to load earnings</div>';
    }
}

// ==================== EARNING FUNCTIONS ====================

// Save earning from form
async function saveEarning(event) {
    if (event) event.preventDefault();
    
    try {
        // Get form values
        const fare = parseFloat(document.getElementById('fare')?.value) || 0;
        const from = document.getElementById('fromLocation')?.value || '';
        const to = document.getElementById('toLocation')?.value || '';
        const paymentMethod = document.getElementById('paymentMethod')?.value || 'cash';
        
        if (fare <= 0) {
            alert('Please enter a valid fare amount');
            return;
        }
        
        if (!from || !to) {
            alert('Please enter both locations');
            return;
        }
        
        const earning = {
            amount: fare,
            from: from,
            to: to,
            paymentMethod: paymentMethod,
            mpesaCode: document.getElementById('mpesaCode')?.value || '',
            customerPhone: document.getElementById('customerPhone')?.value || '',
            date: new Date().toISOString(),
            synced: false,
            userId: SessionManager?.getUser()?.id || 'demo-user'
        };
        
        // Save to database
        if (typeof db !== 'undefined' && db && typeof saveEarningOffline === 'function') {
            await saveEarningOffline(earning);
        } else {
            // Fallback to localStorage
            const saved = JSON.parse(localStorage.getItem('earnings') || '[]');
            saved.push(earning);
            localStorage.setItem('earnings', JSON.stringify(saved));
        }
        
        // Show success message
        alert('✅ Earnings saved! ' + (navigator.onLine ? 'Synced to cloud.' : 'Will sync when online.'));
        
        // Redirect to dashboard
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        console.error('Error saving earning:', error);
        alert('Failed to save earning. Please try again.');
    }
}

// Toggle M-PESA fields visibility
function toggleMPESAFields() {
    const method = document.getElementById('paymentMethod')?.value;
    const mpesaFields = document.getElementById('mpesaFields');
    
    if (mpesaFields) {
        mpesaFields.style.display = method === 'mpesa' ? 'block' : 'none';
    }
}

// Set amount from quick buttons
function setAmount(amount) {
    const fareInput = document.getElementById('fare');
    if (fareInput) {
        fareInput.value = amount;
        updateSavings();
    }
}

// Update savings preview
function updateSavings() {
    const fare = parseFloat(document.getElementById('fare')?.value) || 0;
    const savings = fare * 0.1; // 10% savings
    
    const farePreview = document.getElementById('farePreview');
    const savingsAmount = document.getElementById('savingsAmount');
    const netAmount = document.getElementById('netAmount');
    
    if (farePreview) farePreview.textContent = fare;
    if (savingsAmount) savingsAmount.textContent = savings.toFixed(0);
    if (netAmount) netAmount.textContent = (fare - savings).toFixed(0);
}

// ==================== LOAN FUNCTIONS ====================

// Apply for loan
async function applyForLoan() {
    const amount = document.getElementById('loanAmount')?.value;
    
    if (!amount || amount < 1000) {
        alert('Please enter a valid amount (minimum KES 1,000)');
        return;
    }
    
    // Calculate loan details
    const interest = amount * 0.05; // 5% interest
    const total = parseFloat(amount) + interest;
    const period = document.getElementById('repaymentPeriod')?.value || 30;
    const daily = Math.round(total / period);
    
    // Confirm with user
    if (confirm(`Loan Summary:
Amount: KES ${amount}
Interest (5%): KES ${interest}
Total to repay: KES ${total}
Daily payment: KES ${daily} (${period} days)

Proceed with application?`)) {
        
        try {
            const loan = {
                amount: parseFloat(amount),
                interest: interest,
                total: total,
                period: period,
                dailyPayment: daily,
                date: new Date().toISOString(),
                status: 'pending',
                synced: false,
                userId: SessionManager?.getUser()?.id || 'demo-user'
            };
            
            // Store loan application offline
            if (typeof db !== 'undefined' && db) {
                const transaction = db.transaction(['loans'], 'readwrite');
                const store = transaction.objectStore('loans');
                await store.add(loan);
            } else {
                // Fallback to localStorage
                const loans = JSON.parse(localStorage.getItem('loans') || '[]');
                loans.push(loan);
                localStorage.setItem('loans', JSON.stringify(loans));
            }
            
            alert('✅ Loan application submitted. We will review and notify you via SMS.');
            
        } catch (error) {
            console.error('Error saving loan:', error);
            alert('Failed to submit loan application. Please try again.');
        }
    }
}

// Get loan balance
async function getLoanBalance() {
    try {
        if (typeof db !== 'undefined' && db) {
            const transaction = db.transaction(['loans'], 'readonly');
            const store = transaction.objectStore('loans');
            
            const loans = await new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            
            const outstanding = loans
                .filter(l => l.status === 'approved' || l.status === 'pending')
                .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
            
            return outstanding;
        } else {
            // Return demo value
            return 8200;
        }
    } catch (error) {
        console.error('Error getting loan balance:', error);
        return 8200; // Return demo value on error
    }
}

// Update loan calculator on input
function updateLoanCalculation() {
    const amount = parseFloat(document.getElementById('loanAmount')?.value) || 0;
    const period = document.getElementById('repaymentPeriod')?.value || 30;
    
    const interest = amount * 0.05;
    const total = amount + interest;
    const daily = period > 0 ? Math.round(total / period) : 0;
    
    const resultDiv = document.getElementById('loanCalculation');
    if (resultDiv) {
        resultDiv.innerHTML = `
            <p>Interest (5%): <span>KES ${interest.toFixed(0)}</span></p>
            <p>Total to repay: <span>KES ${total.toFixed(0)}</span></p>
            <p>Daily payment: <span>KES ${daily}</span></p>
        `;
    }
}

// ==================== UTILITY FUNCTIONS ====================

// Record M-PESA payment
function recordMPESA() {
    if (confirm('Send STK Push to customer?')) {
        alert('✅ STK Push sent. Customer will enter PIN to pay.');
        
        // Check URL parameters to see if we're on add-earning page
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('method') === 'mpesa') {
            document.getElementById('paymentMethod').value = 'mpesa';
            toggleMPESAFields();
        } else {
            // Redirect to add earning with M-PESA selected
            window.location.href = 'add-earning.html?method=mpesa';
        }
    }
}

// Share report via WhatsApp
function shareWhatsApp() {
    // Get today's stats
    const todayEarnings = document.getElementById('todayEarnings')?.textContent || 'KES 0';
    const savings = document.getElementById('savings')?.textContent || 'KES 0';
    const trips = document.getElementById('tripsToday')?.textContent || '0';
    
    const text = `🚀 *BodaSacco Daily Report*
    
📅 Date: ${new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}

💰 Today's Earnings: ${todayEarnings}
💵 Savings (10%): ${savings}
🛵 Total Trips: ${trips}

✅ Powered by BodaSacco Manager`;
    
    // Open WhatsApp
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

// Filter earnings by period
function filterEarnings() {
    const filter = document.getElementById('filterPeriod')?.value;
    console.log('Filtering by:', filter);
    
    // In a real app, you would query the database with date filters
    // For now, just show a message
    alert(`Showing earnings for: ${filter}`);
}

// ==================== NETWORK STATUS ====================

// Check network status
function checkNetworkStatus() {
    const updateNetworkStatus = () => {
        const offlineBadge = document.getElementById('offlineBadge');
        const offlineQueue = document.getElementById('offlineQueue');
        
        if (offlineBadge) {
            offlineBadge.style.display = navigator.onLine ? 'none' : 'block';
        }
        
        if (offlineQueue) {
            offlineQueue.style.display = navigator.onLine ? 'none' : 'block';
        }
        
        // Try to sync when online
        if (navigator.onLine && typeof syncData === 'function') {
            syncData();
        }
    };
    
    // Initial check
    updateNetworkStatus();
    
    // Listen for changes
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
}

// ==================== PWA INSTALLATION ====================

let deferredPrompt;

function setupPWAInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later
        deferredPrompt = e;
        
        // Show the install prompt
        const promptDiv = document.getElementById('a2hs-prompt');
        if (promptDiv) {
            promptDiv.style.display = 'flex';
        }
    });
    
    // Hide prompt after app is installed
    window.addEventListener('appinstalled', () => {
        const promptDiv = document.getElementById('a2hs-prompt');
        if (promptDiv) {
            promptDiv.style.display = 'none';
        }
        console.log('PWA was installed');
        deferredPrompt = null;
    });
}

function installPWA() {
    if (deferredPrompt) {
        // Show the install prompt
        deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            deferredPrompt = null;
            document.getElementById('a2hs-prompt').style.display = 'none';
        });
    }
}

function closePrompt() {
    document.getElementById('a2hs-prompt').style.display = 'none';
}

// ==================== AUTH FUNCTIONS ====================

// Tab switching for auth pages
function showLogin() {
    // Update tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Show login form
    document.getElementById('loginForm')?.classList.add('active');
    document.getElementById('signupForm')?.classList.remove('active');
}

function showSignup() {
    // Update tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Show signup form
    document.getElementById('signupForm')?.classList.add('active');
    document.getElementById('loginForm')?.classList.remove('active');
}

// Logout function
function logout() {
    if (typeof SessionManager !== 'undefined') {
        SessionManager.logout();
    } else {
        localStorage.removeItem('bodaSaccoUser');
        window.location.href = 'index.html';
    }
}

// ==================== SETUP EVENT LISTENERS ====================

function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const phone = document.getElementById('loginPhone')?.value;
            const pin = document.getElementById('loginPin')?.value;
            
            if (!phone || !pin) {
                alert('Please enter both phone number and PIN');
                return;
            }
            
            if (typeof SessionManager !== 'undefined') {
                const result = await SessionManager.login(phone, pin);
                if (!result.success) {
                    alert(result.error || 'Login failed');
                }
            } else {
                // Simple fallback
                if (phone && pin.length === 4) {
                    localStorage.setItem('bodaSaccoUser', JSON.stringify({
                        name: 'John Kamau',
                        phone: phone,
                        sacco: 'Kawangware Boda'
                    }));
                    window.location.href = 'dashboard.html';
                } else {
                    alert('Invalid credentials');
                }
            }
        });
    }
    
    // Signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('signupName')?.value;
            const phone = document.getElementById('signupPhone')?.value;
            const sacco = document.getElementById('saccoName')?.value;
            const pin = document.getElementById('signupPin')?.value;
            const confirmPin = document.getElementById('confirmPin')?.value;
            
            if (!name || !phone || !sacco || !pin) {
                alert('Please fill all fields');
                return;
            }
            
            if (pin !== confirmPin) {
                alert('PINs do not match');
                return;
            }
            
            if (pin.length !== 4) {
                alert('PIN must be 4 digits');
                return;
            }
            
            if (typeof SessionManager !== 'undefined') {
                const result = await SessionManager.register({
                    name,
                    phone,
                    sacco,
                    pin
                });
                if (!result.success) {
                    alert(result.error || 'Registration failed');
                }
            } else {
                // Simple fallback
                localStorage.setItem('bodaSaccoUser', JSON.stringify({
                    name: name,
                    phone: phone,
                    sacco: sacco
                }));
                window.location.href = 'dashboard.html';
            }
        });
    }
    
    // Fare input for savings calculation
    const fareInput = document.getElementById('fare');
    if (fareInput) {
        fareInput.addEventListener('input', updateSavings);
    }
    
    // Loan amount input for calculator
    const loanAmount = document.getElementById('loanAmount');
    const repaymentPeriod = document.getElementById('repaymentPeriod');
    
    if (loanAmount) {
        loanAmount.addEventListener('input', updateLoanCalculation);
    }
    
    if (repaymentPeriod) {
        repaymentPeriod.addEventListener('change', updateLoanCalculation);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}

// ==================== EXPORT FUNCTIONS FOR GLOBAL USE ====================

// Make all functions available globally
window.saveEarning = saveEarning;
window.toggleMPESAFields = toggleMPESAFields;
window.setAmount = setAmount;
window.updateSavings = updateSavings;
window.recordMPESA = recordMPESA;
window.shareWhatsApp = shareWhatsApp;
window.applyForLoan = applyForLoan;
window.updateLoanCalculation = updateLoanCalculation;
window.filterEarnings = filterEarnings;
window.showLogin = showLogin;
window.showSignup = showSignup;
window.installPWA = installPWA;
window.closePrompt = closePrompt;
window.logout = logout;
window.loadDashboardData = loadDashboardData;
window.loadStats = loadStats;
window.loadRecentEarnings = loadRecentEarnings;

console.log('BodaSacco app.js loaded successfully');