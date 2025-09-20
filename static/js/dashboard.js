const API_BASE_URL = "http://localhost:10000"

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
            <div class="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <div class="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No licenses found</h3>
                    <p class="text-gray-600 dark:text-gray-400">${licenses.length === 0 ? "Add some licenses to get started" : "Try adjusting your filters"}</p>
                </div>
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
    const inactiveClass = !license.active ? "opacity-60 bg-gray-800 dark:bg-gray-900" : "bg-white dark:bg-gray-800"
    licenseCard.className = `${inactiveClass} rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow`

    const statusText =
      remainingDays > 0
        ? `${remainingDays} days`
        : remainingDays === 0
          ? "Today"
          : `${Math.abs(remainingDays)} days ago`

    // Generate level indicators (1-3 circles based on level)
    const levelIndicators = Array.from({ length: 3 }, (_, i) => {
      const isFilled = i < license.level
      let levelColor = "bg-gray-300 dark:bg-gray-600"
      if (isFilled) {
        if (license.level === 1) levelColor = "bg-green-500"
        else if (license.level === 2) levelColor = "bg-yellow-500"
        else if (license.level === 3) levelColor = "bg-red-500"
      }
      return `<div class="w-3 h-3 rounded-full ${levelColor}"></div>`
    }).join("")

    let statusBadgeClass = "px-2 py-1 rounded-full text-xs font-medium"
    if (statusClass === "active")
      statusBadgeClass += " bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    else if (statusClass === "expiring")
      statusBadgeClass += " bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
    else statusBadgeClass += " bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"

    let progressBarClass = "h-2 rounded-full"
    if (statusClass === "active") progressBarClass += " bg-green-500"
    else if (statusClass === "expiring") progressBarClass += " bg-yellow-500"
    else progressBarClass += " bg-red-500"

    const textColor = !license.active ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-white"
    const subtextColor = !license.active ? "text-gray-500 dark:text-gray-600" : "text-gray-600 dark:text-gray-400"

    licenseCard.innerHTML = `
            <div class="flex items-start justify-between mb-4">
                <h3 class="text-lg font-semibold ${textColor} truncate pr-2">${license.name}</h3>
                <div class="flex gap-1 flex-shrink-0">
                    ${levelIndicators}
                </div>
            </div>
            <div class="space-y-3">
                <div class="text-sm ${subtextColor}">
                    <div class="flex justify-between items-center mb-1">
                        <span>Started: ${formatDisplayDate(license.start_date)}</span>
                        ${!license.active ? '<span class="text-xs bg-gray-600 text-white px-2 py-1 rounded">INACTIVE</span>' : ""}
                    </div>
                    <div class="flex justify-between items-center">
                        <span>Expires: ${formatDisplayDate(license.end_date)}</span>
                        <span class="${statusBadgeClass}">${statusText}</span>
                    </div>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div class="${progressBarClass}" style="width: ${progressPercentage}%"></div>
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
  const html = document.documentElement
  const themeToggle = document.getElementById("theme-toggle")

  if (isDarkMode) {
    html.classList.add("dark")
    themeToggle.textContent = "☀️ Light Mode"
    localStorage.setItem("theme", "dark")
  } else {
    html.classList.remove("dark")
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
