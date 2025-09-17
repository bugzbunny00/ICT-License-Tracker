// Global variables
let allLicenses = [];
let filteredLicenses = [];
let isDarkMode = false;

// Theme and filter management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        toggleTheme();
    }
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    
    if (isDarkMode) {
        body.classList.add('dark-mode');
        themeToggle.textContent = '☀️ Light Mode';
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.remove('dark-mode');
        themeToggle.textContent = '🌙 Dark Mode';
        localStorage.setItem('theme', 'light');
    }
}

// Fetch licenses from API
async function fetchLicenses() {
    const resp = await fetch('/api/licenses');
    const data = await resp.json();
    return data;
}

// Convert DD/MM/YYYY to Date object
function parseDate(dateStr) {
    const [day, month, year] = dateStr.split('/');
    return new Date(year, month - 1, day);
}

// Calculate remaining days and progress
function calculateRemaining(startDateStr, endDateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const start = parseDate(startDateStr);
    const end = parseDate(endDateStr);
    
    const totalMs = end - start;
    const elapsedMs = today - start;
    const remainingMs = end - today;
    
    const totalDays = Math.ceil(totalMs / (1000*60*60*24));
    const elapsedDays = Math.ceil(elapsedMs / (1000*60*60*24));
    const remainingDays = Math.ceil(remainingMs / (1000*60*60*24));
    
    const pct = totalDays > 0 ? Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100)) : 0;
    
    return { remainingDays, totalDays, elapsedDays, pct };
}

// Get priority text and styling
function getPriorityText(level) {
    switch(level) {
        case 1: return 'Low Priority';
        case 2: return 'Medium Priority';
        case 3: return 'High Priority';
        default: return 'Unknown Priority';
    }
}

// Format date for display
function formatDate(dateStr) {
    const date = parseDate(dateStr);
    return date.toLocaleDateString('en-GB');
}

// Get status information
function getStatusInfo(remainingDays, active) {
    let statusText, statusClass;
    
    if (!active) {
        statusText = 'Inactive';
        statusClass = 'inactive';
    } else if (remainingDays > 60) {
        statusText = `${remainingDays} days remaining`;
        statusClass = 'active';
    } else if (remainingDays >= 0) {
        statusText = `${remainingDays} days remaining`;
        statusClass = 'expiring';
    } else if (remainingDays === -1) {
        statusText = 'Expired 1 day ago';
        statusClass = 'expired';
    } else {
        statusText = `Expired ${Math.abs(remainingDays)} days ago`;
        statusClass = 'expired';
    }
    
    return { statusText, statusClass };
}

// Render individual license card
function renderCard(lic) {
    const { name, start_date, end_date, active, level } = lic;
    const { remainingDays, totalDays, elapsedDays, pct } = calculateRemaining(start_date, end_date);
    const { statusText, statusClass } = getStatusInfo(remainingDays, active);
    
    const card = document.createElement('div');
    card.className = `license-card ${statusClass}`;
    
    const expiryText = remainingDays > 0 ? `Expires: ${formatDate(end_date)}` : 
                      remainingDays === 0 ? 'Expires today' : 
                      `Expired: ${formatDate(end_date)}`;
    
    const daysText = remainingDays > 0 ? `${remainingDays} days` : 
                    remainingDays === 0 ? 'Today' : 
                    `${Math.abs(remainingDays)} days ago`;
    
    // Generate level indicators (1-3 circles based on level)
    const levelIndicators = Array.from({ length: 3 }, (_, i) => {
        const isFilled = i < level;
        const levelClass = level === 2 ? 'level-2' : level === 3 ? 'level-3' : level === 1 ? 'level-1' : '';
        return `<div class="level-circle ${isFilled ? 'filled' : ''} ${levelClass}"></div>`;
    }).join('');
    
    const html = `
        <div class="card-header">
            <h3 class="license-name">${name}</h3>
            <div class="level-indicators">
                ${levelIndicators}
            </div>
        </div>
        
        <div class="card-content">
            <div class="date-info">
                <span class="start-date">Started: ${formatDate(start_date)}</span>
                <div class="expiry-info">
                    <span class="expiry-text">${expiryText}</span>
                    <span class="days-badge ${statusClass}">${daysText}</span>
                </div>
            </div>
            
            <div class="progress-section">
                <div class="progress-bar">
                    <div class="progress-inner ${statusClass}" style="width: ${pct}%"></div>
                </div>
            </div>
        </div>
    `;
    
    card.innerHTML = html;
    return card;
}


// Filter licenses based on current filter settings
function filterLicenses() {
    const statusFilter = document.getElementById('filter-status').value;
    const priorityFilter = document.getElementById('filter-priority').value;
    
    filteredLicenses = allLicenses.filter(license => {
        const { remainingDays } = calculateRemaining(license.start_date, license.end_date);
        const { statusClass } = getStatusInfo(remainingDays, license.active);
        
        // Status filter
        let statusMatch = true;
        if (statusFilter === 'active') statusMatch = license.active;
        else if (statusFilter === 'inactive') statusMatch = !license.active;
        else if (statusFilter === 'expiring') statusMatch = license.active && remainingDays <= 60 && remainingDays >= 0;
        else if (statusFilter === 'expired') statusMatch = remainingDays < 0;
        
        // Priority filter
        let priorityMatch = true;
        if (priorityFilter !== 'all') {
            priorityMatch = license.level.toString() === priorityFilter;
        }
        
        return statusMatch && priorityMatch;
    });
    
    renderLicenses();
}

// Render all filtered licenses
function renderLicenses() {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';
    
    if (filteredLicenses.length === 0) {
        container.innerHTML = '<div class="no-results">No licenses match the current filters.</div>';
        return;
    }
    
    // Sort by remaining days (expiring soon first)
    filteredLicenses.sort((a, b) => {
        const aRemaining = calculateRemaining(a.start_date, a.end_date).remainingDays;
        const bRemaining = calculateRemaining(b.start_date, b.end_date).remainingDays;
        return aRemaining - bRemaining;
    });
    
    filteredLicenses.forEach(license => {
        const card = renderCard(license);
        container.appendChild(card);
    });
}

// Initialize the application
async function setup() {
    try {
        allLicenses = await fetchLicenses();
        filteredLicenses = [...allLicenses];
        
        // Set up event listeners
        document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
        document.getElementById('filter-status').addEventListener('change', filterLicenses);
        document.getElementById('filter-priority').addEventListener('change', filterLicenses);
        
        // Initialize theme
        initializeTheme();
        
        // Render initial licenses
        renderLicenses();
        
    } catch (error) {
        console.error('Error initializing application:', error);
        document.getElementById('cards-container').innerHTML = 
            '<div class="error-message">Error loading licenses. Please refresh the page.</div>';
    }
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', setup);
  