const adminLoginSection = document.getElementById('admin-login-section');
const adminDashboardSection = document.getElementById('admin-dashboard-section');
const adminLoginForm = document.getElementById('admin-login-form');
const adminLoginError = document.getElementById('admin-login-error');
const adminLogoutBtn = document.getElementById('admin-logout-btn');
const adminWelcomeTitle = document.getElementById('admin-welcome-title');
const announcementForm = document.getElementById('announcement-form');
const announcementMessage = document.getElementById('announcement-message');
const announcementStatus = document.getElementById('announcement-status');
const adminAnnouncementsList = document.getElementById('admin-announcements-list');
const attendanceTableBody = document.querySelector('#attendance-table tbody');
const complaintsList = document.getElementById('complaints-list');
const noComplaints = document.getElementById('no-complaints');

const adminStorageKey = 'vu_attendy_admin_current';
let currentAdmin = null;

function loadAdmin() {
  const saved = localStorage.getItem(adminStorageKey);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

function saveAdmin(admin) {
  localStorage.setItem(adminStorageKey, JSON.stringify(admin));
}

function clearAdmin() {
  localStorage.removeItem(adminStorageKey);
}

function showAdminDashboard() {
  adminLoginSection.classList.add('hidden');
  adminDashboardSection.classList.remove('hidden');
  adminWelcomeTitle.textContent = `Welcome, ${currentAdmin.name}`;
  loadAdminAnnouncements();
  loadAttendance();
  loadComplaints();
}

function showAdminLogin() {
  adminDashboardSection.classList.add('hidden');
  adminLoginSection.classList.remove('hidden');
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

adminLoginForm.addEventListener('submit', async event => {
  event.preventDefault();
  adminLoginError.textContent = '';

  const username = document.getElementById('admin-username').value.trim();
  const password = document.getElementById('admin-password').value.trim();

  try {
    const admin = await requestJson('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    currentAdmin = { username, password, ...admin };
    saveAdmin(currentAdmin);
    showAdminDashboard();
  } catch (error) {
    adminLoginError.textContent = error.message;
  }
});

announcementForm.addEventListener('submit', async event => {
  event.preventDefault();
  announcementStatus.textContent = '';

  if (!currentAdmin) return;

  try {
    await requestJson('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: currentAdmin.username,
        password: currentAdmin.password,
        message: announcementMessage.value.trim()
      })
    });

    announcementMessage.value = '';
    announcementStatus.textContent = 'Announcement published.';
    loadAdminAnnouncements();
  } catch (error) {
    announcementStatus.textContent = error.message;
  }
});

adminLogoutBtn.addEventListener('click', () => {
  clearAdmin();
  currentAdmin = null;
  showAdminLogin();
});

async function loadAdminAnnouncements() {
  try {
    const announcements = await requestJson('/api/announcements');
    adminAnnouncementsList.innerHTML = announcements.map(a => `<li><strong>${new Date(a.createdAt).toLocaleDateString()}</strong><p>${a.message}</p></li>`).join('');
  } catch (error) {
    adminAnnouncementsList.innerHTML = `<li>${error.message}</li>`;
  }
}

async function loadAttendance() {
  if (!currentAdmin) return;

  try {
    const attendance = await requestJson(`/api/attendance/all?adminUser=${encodeURIComponent(currentAdmin.username)}&adminPassword=${encodeURIComponent(currentAdmin.password)}`);
    attendanceTableBody.innerHTML = attendance.map(record => {
      const location = record.location ? `${record.location.latitude.toFixed(4)}, ${record.location.longitude.toFixed(4)}` : 'No location';
      return `
        <tr>
          <td>${record.employeeId}</td>
          <td>${record.date}</td>
          <td>${new Date(record.loginTime).toLocaleTimeString()}</td>
          <td>${record.logoutTime ? new Date(record.logoutTime).toLocaleTimeString() : '—'}</td>
          <td>${location}</td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    attendanceTableBody.innerHTML = `<tr><td colspan="5">${error.message}</td></tr>`;
  }
}

async function loadComplaints() {
  if (!currentAdmin) return;

  try {
    const complaints = await requestJson(`/api/complaints?adminUser=${encodeURIComponent(currentAdmin.username)}&adminPassword=${encodeURIComponent(currentAdmin.password)}`);
    if (!complaints.length) {
      noComplaints.classList.remove('hidden');
      complaintsList.innerHTML = '';
      return;
    }

    noComplaints.classList.add('hidden');
    complaintsList.innerHTML = complaints.map(c => `<li><strong>${c.employeeId} - ${new Date(c.createdAt).toLocaleDateString()}</strong><p>${c.message}</p></li>`).join('');
  } catch (error) {
    complaintsList.innerHTML = `<li>${error.message}</li>`;
  }
}

window.addEventListener('load', () => {
  const saved = loadAdmin();
  if (saved) {
    currentAdmin = saved;
    showAdminDashboard();
    return;
  }
  showAdminLogin();
});
