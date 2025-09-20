const API_BASE_URL = "http://127.0.0.1:10000"

let currentEditingIndex = -1
let deleteIndex = -1
let isDarkMode = false
let startDatePicker, endDatePicker

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

function convertToDateInput(ddmmyyyy) {
  if (!ddmmyyyy) return ""
  const [day, month, year] = ddmmyyyy.split("/")
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
}

function convertFromDateInput(yyyymmdd) {
  if (!yyyymmdd) return ""
  const [year, month, day] = yyyymmdd.split("-")
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
    const tableBody = document.getElementById("licenses-table-body")

    tableBody.innerHTML = ""

    licenses.forEach((license, index) => {
      const remainingDays = calculateRemainingDays(license.start_date, license.end_date)
      const statusClass = getStatusClass(remainingDays)

      const row = document.createElement("tr")
      const inactiveClass = !license.active
        ? "bg-gray-800 dark:bg-black opacity-60"
        : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
      row.className = `${inactiveClass} transition-colors`

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
        let levelColor = "bg-gray-300 dark:bg-gray-600"
        if (isFilled) {
          if (license.level === 1) levelColor = "bg-green-500"
          else if (license.level === 2) levelColor = "bg-yellow-500"
          else if (license.level === 3) levelColor = "bg-red-500"
        }
        return `<div class="w-3 h-3 rounded-full ${levelColor}"></div>`
      }).join("")

      const daysText =
        remainingDays > 0
          ? `${remainingDays} days`
          : remainingDays === 0
            ? "Today"
            : `${Math.abs(remainingDays)} days ago`

      let statusBadgeClass = "px-2 py-1 rounded-full text-xs font-medium"
      if (statusClass === "active")
        statusBadgeClass += " bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      else if (statusClass === "expiring")
        statusBadgeClass += " bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      else statusBadgeClass += " bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"

      const textColor = !license.active ? "text-gray-500 dark:text-gray-600" : "text-gray-900 dark:text-white"
      const subtextColor = !license.active ? "text-gray-600 dark:text-gray-700" : "text-gray-600 dark:text-gray-400"

      row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="text-sm font-medium ${textColor}">${license.name}</div>
                        ${!license.active ? '<div class="text-xs text-gray-500 dark:text-gray-600 mt-1 font-semibold">INACTIVE</div>' : ""}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex gap-1">
                        ${levelIndicators}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm ${subtextColor}">
                    ${formatDisplayDate(license.start_date)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm ${subtextColor}">
                    ${formatDisplayDate(license.end_date)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="${statusBadgeClass}">
                        ${license.active ? (statusClass === "active" ? "Active" : statusClass === "expiring" ? "Expiring" : "Expired") : "Inactive"}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm ${subtextColor}">
                    ${daysText}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div class="flex gap-2">
                        <button class="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300" onclick="editLicense(${index})">Edit</button>
                        <button class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" onclick="showDeleteModal(${index}, '${license.name}')">Delete</button>
                    </div>
                </td>
            `

      tableBody.appendChild(row)
    })
  } catch (error) {
    console.error("Error loading licenses:", error)
    const tableBody = document.getElementById("licenses-table-body")
    tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center">
                    <div class="text-gray-500 dark:text-gray-400">
                        <h3 class="text-lg font-semibold mb-2">Error Loading Licenses</h3>
                        <p class="mb-4">Unable to connect to the server. Please check your connection and try again.</p>
                        <p class="text-sm mb-4">Error: ${error.message}</p>
                        <button onclick="loadLicenses()" class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">Retry</button>
                    </div>
                </td>
            </tr>
        `
  }
}

// Show add form
function showAddForm() {
  currentEditingIndex = -1
  document.getElementById("modal-title").textContent = "Add New License"
  document.getElementById("license-form").reset()
  document.getElementById("license-modal").style.display = "flex"
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
      document.getElementById("start_date").value = convertToDateInput(license.start_date)
      document.getElementById("end_date").value = convertToDateInput(license.end_date)
      document.getElementById("level").value = license.level
      document.getElementById("active").value = license.active.toString()
      document.getElementById("license-modal").style.display = "flex"
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
  document.getElementById("delete-modal").style.display = "flex"
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
    start_date: convertFromDateInput(formData.get("start_date")),
    end_date: convertFromDateInput(formData.get("end_date")),
    level: Number.parseInt(formData.get("level")),
    active: formData.get("active") === "true",
  }

  // Basic validation
  if (!licenseData.name.trim()) {
    alert("Please enter a license name.")
    return
  }

  if (!licenseData.start_date || !licenseData.end_date) {
    alert("Please select both start and end dates.")
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

// Load licenses when page loads
document.addEventListener("DOMContentLoaded", () => {
  // Initialize theme
  initializeTheme()

  // Set up theme toggle event listener
  document.getElementById("theme-toggle").addEventListener("click", toggleTheme)

  // Load licenses
  loadLicenses()
})
