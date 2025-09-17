const API_BASE_URL = "https://ict-license-tracker.onrender.com"

let isDarkMode = false

// Parse DD/MM/YYYY date format
function parseDate(dateStr) {
  const [day, month, year] = dateStr.split("/")
  return new Date(year, month - 1, day)
}

// Calculate remaining days
function calculateRemainingDays(startDateStr, endDateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = parseDate(endDateStr)
  const remainingMs = end - today
  return Math.ceil(remainingMs / (1000 * 60 * 60 * 24))
}

// Get status class based on remaining days
function getStatusClass(remainingDays) {
  if (remainingDays > 60) return "active"
  if (remainingDays >= 0) return "expiring"
  return "expired"
}

// Format date for display
function formatDisplayDate(dateStr) {
  const date = parseDate(dateStr)
  return date.toLocaleDateString("en-GB")
}

// Get progress percentage
function getProgressPercentage(startDateStr, endDateStr) {
  const start = parseDate(startDateStr)
  const end = parseDate(endDateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
  const elapsedDays = Math.ceil((today - start) / (1000 * 60 * 60 * 24))

  return Math.min(Math.max((elapsedDays / totalDays) * 100, 0), 100)
}

// Load and display licenses
async function loadLicenses() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/licenses`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const licenses = await response.json()
    displayLicenses(licenses)
  } catch (error) {
    console.error("Error loading licenses:", error)
    const container = document.getElementById("cards-container")
    container.innerHTML = `
            <div class="error-message">
                <h3>Error Loading Licenses</h3>
                <p>Unable to connect to the server. Please check your connection and try again.</p>
                <p>Error: ${error.message}</p>
                <button onclick="loadLicenses()" class="btn btn-secondary" style="margin-top: 15px;">Retry</button>
            </div>
        `
  }
}

// Display licenses with filtering
function displayLicenses(licenses) {
  const container = document.getElementById("cards-container")
  const statusFilter = document.getElementById("filter-status").value
  const priorityFilter = document.getElementById("filter-priority").value

  // Filter licenses
  const filteredLicenses = licenses.filter((license) => {
    const remainingDays = calculateRemainingDays(license.start_date, license.end_date)
    const status = getStatusClass(remainingDays)

    // Status filter
    let statusMatch = true
    if (statusFilter !== "all") {
      switch (statusFilter) {
        case "active":
          statusMatch = license.active && status === "active"
          break
        case "inactive":
          statusMatch = !license.active
          break
        case "expiring":
          statusMatch = license.active && status === "expiring"
          break
        case "expired":
          statusMatch = license.active && status === "expired"
          break
      }
    }

    // Priority filter
    let priorityMatch = true
    if (priorityFilter !== "all") {
      priorityMatch = license.level === Number.parseInt(priorityFilter)
    }

    return statusMatch && priorityMatch
  })

  if (filteredLicenses.length === 0) {
    container.innerHTML = `
            <div class="no-results">
                <h3>No licenses found</h3>
                <p>${licenses.length === 0 ? "Add some licenses to get started" : "Try adjusting your filters"}</p>
            </div>
        `
    return
  }

  container.innerHTML = ""

  filteredLicenses.forEach((license, index) => {
    const remainingDays = calculateRemainingDays(license.start_date, license.end_date)
    const statusClass = getStatusClass(remainingDays)
    const progressPercentage = getProgressPercentage(license.start_date, license.end_date)

    const licenseCard = document.createElement("div")
    licenseCard.className = `license-card ${statusClass}`

    const statusText =
      remainingDays > 0
        ? `${remainingDays} days`
        : remainingDays === 0
          ? "Today"
          : `${Math.abs(remainingDays)} days ago`

    // Generate level indicators (1-3 circles based on level)
    const levelIndicators = Array.from({ length: 3 }, (_, i) => {
      const isFilled = i < license.level
      const levelClass = license.level === 2 ? "level-2" : license.level === 3 ? "level-3" : ""
      return `<div class="level-circle ${isFilled ? "filled" : ""} ${levelClass}"></div>`
    }).join("")

    licenseCard.innerHTML = `
            <div class="card-header">
                <h3 class="license-name">${license.name}</h3>
                <div class="level-indicators">
                    ${levelIndicators}
                </div>
            </div>
            <div class="card-content">
                <div class="date-info">
                    <span class="start-date">Started: ${formatDisplayDate(license.start_date)}</span>
                    <div class="expiry-info">
                        <span class="expiry-text">Expires: ${formatDisplayDate(license.end_date)}</span>
                        <span class="days-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>
                <div class="progress-section">
                    <div class="progress-bar">
                        <div class="progress-inner ${statusClass}" style="width: ${progressPercentage}%"></div>
                    </div>
                </div>
            </div>
        `

    container.appendChild(licenseCard)
  })
}

// Theme management
function initializeTheme() {
  const savedTheme = localStorage.getItem("theme")
  if (savedTheme === "dark") {
    toggleTheme()
  }
}

function toggleTheme() {
  isDarkMode = !isDarkMode
  const body = document.body
  const themeToggle = document.getElementById("theme-toggle")

  if (isDarkMode) {
    body.classList.add("dark-mode")
    themeToggle.textContent = "☀️ Light Mode"
    localStorage.setItem("theme", "dark")
  } else {
    body.classList.remove("dark-mode")
    themeToggle.textContent = "🌙 Dark Mode"
    localStorage.setItem("theme", "light")
  }
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Initialize theme
  initializeTheme()

  // Set up event listeners
  document.getElementById("theme-toggle").addEventListener("click", toggleTheme)
  document.getElementById("filter-status").addEventListener("change", loadLicenses)
  document.getElementById("filter-priority").addEventListener("change", loadLicenses)

  // Load licenses
  loadLicenses()
})
