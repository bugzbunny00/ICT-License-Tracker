// Make sure this is the correct backend URL
const API_BASE = "https://ict-license-tracker.onrender.com/api";

let allLicenses = [];
let filteredLicenses = [];
let isDarkMode = false;

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

async function fetchLicenses() {
    const resp = await fetch(`${API_BASE}/licenses`);
    if (!resp.ok) {
        console.error("Error fetching licenses:", resp.status, await resp.text());
        return [];
    }
    const data = await resp.json();
    return data;
}

function parseDate(dateStr) {
    const [day, month, year] = dateStr.split('/');
    return new Date(year, month - 1, day);
}

function calculateRemaining(startDateStr, endDateStr) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const start = parseDate(startDateStr);
    const end = parseDate(endDateStr);

    const totalMs = end - start;
    const elapsedMs = today - start;
    const remainingMs = end - today;
    
    const totalDays = totalMs > 0 ? Math.ceil(totalMs / (1000 * 60 * 60 * 24)) : 0;
    const elapsedDays = elapsedMs > 0 ? Math.ceil(elapsedMs / (1000 * 60 * 60 * 24)) : 0;
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
    
    const pct = totalDays > 0 ? Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100)) : 0;
    return { remainingDays, totalDays, elapsedDays, pct };
}

function getPriorityText(level) {
    switch(level) {
        case 1: return 'Low Priority';
        case 2: return 'Medium Priority';
        case 3: return 'High Priority';
        default: return 'Unknown Priority';
    }
}

function formatDate(dateStr) {
    const date = parseDate(dateStr);
    return date.toLocaleDateString('en-GB');
}

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
    } else {
        statusText = `Expired ${Math.abs(remainingDays)} days ago`;
        statusClass = 'expired';
    }
    return { statusText, statusClass };
}

function renderCard(lic) {
    const { name, start_date, end_date, active, level } = lic;
    const { remainingDays, totalDays, elapsedDays, pct } = calculateRemaining(start_date, end_date);
    const { statusText, statusClass } = getStatusInfo(remainingDays, active);

    const card = document.createElement('div');
    card.className = `license-card ${statusClass}`;

    const expiryText = remainingDays > 0 
        ? `Expires: ${formatDate(end_date)}`
        : remainingDays === 0
            ? 'Expires today'
            : `Expired: ${formatDate(end_date)}`;

    const daysText = remainingDays > 0
        ? `${remainingDays} days`
        : remainingDays === 0
            ? 'Today'
            : `${Math.abs(remainingDays)} days ago`;

    const levelIndicators = Array.from({ length: 3 }, (_, i) => {
        const isFilled = i < level;
        const levelClass = level === 2 ? 'level-2' : level === 3 ? 'level-3' : 'level-1';
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

function filterLicenses() {
    const statusFilter = document.getElementById('filter-status').value;
    const priorityFilter = document.getElementById('filter-priority').value;
    
    filteredLicenses = allLicenses.filter(license => {
        const { remainingDays } = calculateRemaining(license.start_date, license.end_date);
        const { statusClass } = getStatusInfo(remainingDays, license.active);

        let statusMatch = true;
        if (statusFilter === 'active') statusMatch = license.active;
        else if (statusFilter === 'inactive') statusMatch = !license.active;
        else if (statusFilter === 'expiring') statusMatch = license.active && remainingDays <= 60 && remainingDays >= 0;
        else if (statusFilter === 'expired') statusMatch = remainingDays < 0;

        let priorityMatch = true;
        if (priorityFilter !== 'all') {
            priorityMatch = license.level.toString() === priorityFilter;
        }

        return statusMatch && priorityMatch;
    });
    renderLicenses();
}

function renderLicenses() {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';
    if (!filteredLicenses || filteredLicenses.length === 0) {
        container.innerHTML = '<div class="no-results">No licenses match the current filters.</div>';
        return;
    }
    filteredLicenses.sort((a, b) => {
        const aRem = calculateRemaining(a.start_date, a.end_date).remainingDays;
        const bRem = calculateRemaining(b.start_date, b.end_date).remainingDays;
        return aRem - bRem;
    });
    filteredLicenses.forEach(lic => {
        const card = renderCard(lic);
        container.appendChild(card);
    });
}

async function setup() {
    try {
        allLicenses = await fetchLicenses();
        filteredLicenses = [...allLicenses];

        document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
        document.getElementById('filter-status').addEventListener('change', filterLicenses);
        document.getElementById('filter-priority').addEventListener('change', filterLicenses);

        initializeTheme();
        renderLicenses();
        
    } catch (error) {
        console.error('Error initializing application:', error);
        document.getElementById('cards-container').innerHTML = 
            '<div class="error-message">Error loading licenses. Please refresh the page.</div>';
    }
}

window.addEventListener('DOMContentLoaded', setup);
