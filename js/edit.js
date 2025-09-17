const API_BASE_URL = "https://ict-license-tracker.onrender.com"

let currentEditingIndex = -1
let deleteIndex = -1
let isDarkMode = false

// Parse DD/MM/YYYY date format
function parseDate(dateStr) {
  const [day, month, year] = dateStr.split("/")
  return new Date(year, month - 1, day)
}

// Format date to DD/MM/YYYY
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
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

// Get priority text
function getPriorityText(level) {
  switch (level) {
    case 1:
      return "Low Priority"
    case 2:
      return "Medium Priority"
    case 3:
      return "High Priority"
    default:
      return "Unknown Priority"
  }
}

// Format date for display
function formatDisplayDate(dateStr) {
  const date = parseDate(dateStr)
  return date.toLocaleDateString("en-GB")
}

// Load and display licenses
async function loadLicenses() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/licenses`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const licenses = await response.json()
    const container = document.getElementById("licenses-list")

    container.innerHTML = ""

    licenses.forEach((license, index) => {
      const remainingDays = calculateRemainingDays(license.start_date, license.end_date)
      const statusClass = getStatusClass(remainingDays)

      const licenseItem = document.createElement("div")
      licenseItem.className = `license-item ${statusClass}`

      const statusText =
        remainingDays > 0
          ? `${remainingDays} days remaining`
          : remainingDays === 0
            ? "Expires today"
            : Math.abs(remainingDays) === 1
              ? "Expired 1 day ago"
              : `Expired ${Math.abs(remainingDays)} days ago`

      // Generate level indicators (1-3 circles based on level)
      const levelIndicators = Array.from({ length: 3 }, (_, i) => {
        const isFilled = i < license.level
        const levelClass = license.level === 2 ? "level-2" : license.level === 3 ? "level-3" : ""
        return `<div class="level-circle ${isFilled ? "filled" : ""} ${levelClass}"></div>`
      }).join("")

      const daysText =
        remainingDays > 0
          ? `${remainingDays} days`
          : remainingDays === 0
            ? "Today"
            : `${Math.abs(remainingDays)} days ago`

      licenseItem.innerHTML = `
                <div class="license-header">
                    <h3 class="license-title">${license.name}</h3>
                    <div class="level-indicators">
                        ${levelIndicators}
                    </div>
                </div>
                <div class="license-content">
                    <div class="date-info">
                        <span class="start-date">Started: ${formatDisplayDate(license.start_date)}</span>
                        <div class="expiry-info">
                            <span class="expiry-text">Expires: ${formatDisplayDate(license.end_date)}</span>
                            <span class="days-badge ${statusClass}">${daysText}</span>
                        </div>
                    </div>
                    <div class="license-actions">
                        <button class="btn btn-primary btn-small" onclick="editLicense(${index})">Edit</button>
                        <button class="btn btn-danger btn-small" onclick="showDeleteModal(${index}, '${license.name}')">Delete</button>
                    </div>
                </div>
            `

      container.appendChild(licenseItem)
    })
  } catch (error) {
    console.error("Error loading licenses:", error)
    const container = document.getElementById("licenses-list")
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

// Show add form
function showAddForm() {
  currentEditingIndex = -1
  document.getElementById("modal-title").textContent = "Add New License"
  document.getElementById("license-form").reset()
  document.getElementById("license-modal").style.display = "block"
}

// Edit license
function editLicense(index) {
  currentEditingIndex = index

  fetch(`${API_BASE_URL}/api/licenses`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    })
    .then((licenses) => {
      const license = licenses[index]
      document.getElementById("modal-title").textContent = "Edit License"
      document.getElementById("name").value = license.name
      document.getElementById("start_date").value = license.start_date
      document.getElementById("end_date").value = license.end_date
      document.getElementById("level").value = license.level
      document.getElementById("active").value = license.active.toString()
      document.getElementById("license-modal").style.display = "block"
    })
    .catch((error) => {
      console.error("Error loading license:", error)
      alert("Error loading license data: " + error.message)
    })
}

// Close modal
function closeModal() {
  document.getElementById("license-modal").style.display = "none"
  document.getElementById("license-form").reset()
}

// Show delete confirmation modal
function showDeleteModal(index, licenseName) {
  deleteIndex = index
  document.getElementById("delete-license-name").textContent = licenseName
  document.getElementById("delete-modal").style.display = "block"
}

// Close delete modal
function closeDeleteModal() {
  document.getElementById("delete-modal").style.display = "none"
  deleteIndex = -1
}

// Confirm delete
async function confirmDelete() {
  if (deleteIndex === -1) return

  try {
    const response = await fetch(`${API_BASE_URL}/api/licenses/${deleteIndex}`, {
      method: "DELETE",
    })

    if (response.ok) {
      closeDeleteModal()
      loadLicenses()
      alert("License deleted successfully!")
    } else {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
  } catch (error) {
    console.error("Error deleting license:", error)
    alert("Error deleting license: " + error.message)
  }
}

// Handle form submission
document.getElementById("license-form").addEventListener("submit", async function (e) {
  e.preventDefault()

  const formData = new FormData(this)
  const licenseData = {
    name: formData.get("name"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
    level: Number.parseInt(formData.get("level")),
    active: formData.get("active") === "true",
  }

  // Basic validation
  if (!licenseData.name.trim()) {
    alert("Please enter a license name.")
    return
  }

  // Validate date format (DD/MM/YYYY)
  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/
  if (!dateRegex.test(licenseData.start_date) || !dateRegex.test(licenseData.end_date)) {
    alert("Please enter dates in DD/MM/YYYY format.")
    return
  }

  // Validate that end date is after start date
  const startDate = parseDate(licenseData.start_date)
  const endDate = parseDate(licenseData.end_date)
  if (endDate <= startDate) {
    alert("End date must be after start date.")
    return
  }

  try {
    let response
    if (currentEditingIndex === -1) {
      // Add new license
      response = await fetch(`${API_BASE_URL}/api/licenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(licenseData),
      })
    } else {
      // Update existing license
      response = await fetch(`${API_BASE_URL}/api/licenses/${currentEditingIndex}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(licenseData),
      })
    }

    if (response.ok) {
      closeModal()
      loadLicenses()
      alert(currentEditingIndex === -1 ? "License added successfully!" : "License updated successfully!")
    } else {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
  } catch (error) {
    console.error("Error saving license:", error)
    alert("Error saving license: " + error.message)
  }
})

// Close modals when clicking outside
window.addEventListener("click", (event) => {
  const licenseModal = document.getElementById("license-modal")
  const deleteModal = document.getElementById("delete-modal")

  if (event.target === licenseModal) {
    closeModal()
  }
  if (event.target === deleteModal) {
    closeDeleteModal()
  }
})

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

// Load licenses when page loads
document.addEventListener("DOMContentLoaded", () => {
  // Initialize theme
  initializeTheme()

  // Set up theme toggle event listener
  document.getElementById("theme-toggle").addEventListener("click", toggleTheme)

  // Load licenses
  loadLicenses()
})
