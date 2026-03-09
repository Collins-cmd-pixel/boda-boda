// Member management for SACCO admin

// Load members on page load
document.addEventListener('DOMContentLoaded', () => {
    loadMembers();
    loadMemberStats();
});

// Load all members
async function loadMembers() {
    const membersList = document.getElementById('membersList');
    if (!membersList) return;

    try {
        // Try to get from IndexedDB first
        const transaction = db.transaction('members', 'readonly');
        const store = transaction.objectStore('members');
        const members = await store.getAll();

        if (members.length === 0) {
            // Load sample data for demo
            loadSampleMembers();
            return;
        }

        displayMembers(members);
    } catch (error) {
        console.error('Error loading members:', error);
        membersList.innerHTML = '<div class="error-message">Failed to load members</div>';
    }
}

// Display members in list
function displayMembers(members) {
    const membersList = document.getElementById('membersList');
    
    membersList.innerHTML = members.map(member => `
        <div class="member-card" onclick="viewMember('${member.phone}')">
            <div class="member-avatar">
                <span class="avatar-icon">👤</span>
            </div>
            <div class="member-info">
                <h4>${member.name}</h4>
                <p class="member-phone">${formatPhone(member.phone)}</p>
                <p class="member-bike">${member.bikeReg || 'No bike registered'}</p>
            </div>
            <div class="member-stats-mini">
                <span class="stat">💰 KES ${member.totalSavings || 0}</span>
                <span class="stat">📊 ${member.tripsThisMonth || 0} trips</span>
            </div>
        </div>
    `).join('');

    // Update total members count
    document.getElementById('totalMembers').textContent = members.length;
}

// Load sample members for demo
async function loadSampleMembers() {
    const sampleMembers = [
        {
            name: 'Peter Okoth',
            phone: '0722123456',
            bikeReg: 'KMEB 123A',
            joinDate: '2025-01-15',
            totalSavings: 12500,
            tripsThisMonth: 87,
            active: true
        },
        {
            name: 'Mary Wanjiku',
            phone: '0733765432',
            bikeReg: 'KMEB 456B',
            joinDate: '2025-02-20',
            totalSavings: 8900,
            tripsThisMonth: 63,
            active: true
        },
        {
            name: 'James Otieno',
            phone: '0711987654',
            bikeReg: 'KMEB 789C',
            joinDate: '2025-03-10',
            totalSavings: 5400,
            tripsThisMonth: 42,
            active: false
        },
        {
            name: 'Sarah Akinyi',
            phone: '0744556677',
            bikeReg: 'KMEB 321D',
            joinDate: '2025-04-05',
            totalSavings: 3200,
            tripsThisMonth: 28,
            active: true
        }
    ];

    // Save to IndexedDB
    const transaction = db.transaction('members', 'readwrite');
    const store = transaction.objectStore('members');
    
    for (const member of sampleMembers) {
        await store.put(member);
    }

    displayMembers(sampleMembers);
    loadMemberStats();
}

// Load member statistics
async function loadMemberStats() {
    const transaction = db.transaction('members', 'readonly');
    const store = transaction.objectStore('members');
    const members = await store.getAll();

    const totalMembers = members.length;
    const activeToday = members.filter(m => m.active).length;
    const totalSavings = members.reduce((sum, m) => sum + (m.totalSavings || 0), 0);

    document.getElementById('totalMembers').textContent = totalMembers;
    document.getElementById('activeToday').textContent = activeToday;
    document.getElementById('totalSavings').textContent = `KES ${totalSavings.toLocaleString()}`;
}

// Search members
function searchMembers() {
    const searchTerm = document.getElementById('memberSearch').value.toLowerCase();
    const memberCards = document.querySelectorAll('.member-card');

    memberCards.forEach(card => {
        const name = card.querySelector('h4').textContent.toLowerCase();
        const phone = card.querySelector('.member-phone').textContent.toLowerCase();
        
        if (name.includes(searchTerm) || phone.includes(searchTerm)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

// Show add member modal
function showAddMember() {
    document.getElementById('addMemberModal').style.display = 'block';
}

// Close modal
function closeModal() {
    document.getElementById('addMemberModal').style.display = 'none';
}

// Save new member
async function saveMember(event) {
    event.preventDefault();

    const member = {
        name: document.getElementById('memberName').value,
        phone: document.getElementById('memberPhone').value,
        bikeReg: document.getElementById('bikeReg').value,
        joinDate: document.getElementById('joinDate').value,
        totalSavings: 0,
        tripsThisMonth: 0,
        active: true,
        joinedAt: new Date().toISOString()
    };

    try {
        const transaction = db.transaction('members', 'readwrite');
        const store = transaction.objectStore('members');
        await store.put(member);

        alert('Member added successfully!');
        closeModal();
        loadMembers();
        loadMemberStats();
    } catch (error) {
        console.error('Error saving member:', error);
        alert('Failed to save member');
    }
}

// View member details
function viewMember(phone) {
    // In a real app, navigate to member detail page
    alert(`Viewing member ${phone} - This would open member details`);
}

// Format phone number for display
function formatPhone(phone) {
    if (phone.length === 10) {
        return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    }
    return phone;
}

// Export functions
window.showAddMember = showAddMember;
window.closeModal = closeModal;
window.saveMember = saveMember;
window.searchMembers = searchMembers;
window.viewMember = viewMember;