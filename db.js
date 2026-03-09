// IndexedDB wrapper for offline storage

const DB_NAME = 'BodaSaccoDB';
const DB_VERSION = 1;

let db;

// Initialize database
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Create stores
            if (!db.objectStoreNames.contains('earnings')) {
                const earningsStore = db.createObjectStore('earnings', { keyPath: 'id', autoIncrement: true });
                earningsStore.createIndex('date', 'date', { unique: false });
                earningsStore.createIndex('synced', 'synced', { unique: false });
            }

            if (!db.objectStoreNames.contains('loans')) {
                const loansStore = db.createObjectStore('loans', { keyPath: 'id', autoIncrement: true });
                loansStore.createIndex('status', 'status', { unique: false });
            }

            if (!db.objectStoreNames.contains('members')) {
                db.createObjectStore('members', { keyPath: 'phone' });
            }

            if (!db.objectStoreNames.contains('pendingSync')) {
                db.createObjectStore('pendingSync', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

// Save earning (works offline)
async function saveEarningOffline(earning) {
    earning.date = new Date().toISOString();
    earning.synced = false; // Mark for later sync
    
    const transaction = db.transaction(['earnings', 'pendingSync'], 'readwrite');
    const earningsStore = transaction.objectStore('earnings');
    
    await earningsStore.add(earning);
    
    // Check if online
    if (!navigator.onLine) {
        showOfflineIndicator();
    } else {
        // Try to sync immediately
        syncData();
    }
}

// Get today's earnings
async function getTodayEarnings() {
    const today = new Date().toDateString();
    
    const transaction = db.transaction('earnings', 'readonly');
    const store = transaction.objectStore('earnings');
    const earnings = await store.getAll();
    
    return earnings.filter(e => new Date(e.date).toDateString() === today);
}

// Get earnings by date range
async function getEarningsByRange(startDate, endDate) {
    const transaction = db.transaction('earnings', 'readonly');
    const store = transaction.objectStore('earnings');
    const all = await store.getAll();
    
    return all.filter(e => {
        const date = new Date(e.date);
        return date >= startDate && date <= endDate;
    });
}

// Sync data when back online
async function syncData() {
    if (!navigator.onLine) return;
    
    const transaction = db.transaction(['earnings', 'pendingSync'], 'readonly');
    const store = transaction.objectStore('earnings');
    const unsynced = await store.index('synced').getAll(IDBKeyRange.only(false));
    
    // Here you would send to your backend
    for (const item of unsynced) {
        try {
            // Send to server
            // await fetch('/api/earnings', { method: 'POST', body: JSON.stringify(item) });
            
            // Mark as synced
            const updateTx = db.transaction('earnings', 'readwrite');
            const updateStore = updateTx.objectStore('earnings');
            item.synced = true;
            await updateStore.put(item);
        } catch (error) {
            console.error('Sync failed for item', item.id);
        }
    }
    
    hideOfflineIndicator();
}

// Listen for online/offline events
window.addEventListener('online', () => {
    hideOfflineIndicator();
    syncData();
});

window.addEventListener('offline', () => {
    showOfflineIndicator();
});

// UI indicators
function showOfflineIndicator() {
    const badge = document.getElementById('offlineBadge');
    const queue = document.getElementById('offlineQueue');
    if (badge) badge.style.display = 'block';
    if (queue) queue.style.display = 'block';
}

function hideOfflineIndicator() {
    const badge = document.getElementById('offlineBadge');
    const queue = document.getElementById('offlineQueue');
    if (badge) badge.style.display = 'none';
    if (queue) queue.style.display = 'none';
}

// Initialize on load
initDB().then(() => {
    console.log('Database ready');
    syncData(); // Try to sync any pending data
});