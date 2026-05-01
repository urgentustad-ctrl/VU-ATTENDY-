const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const welcomeTitle = document.getElementById('welcome-title');
const employeeInfo = document.getElementById('employee-info');
const attendanceStatus = document.getElementById('attendance-status');
const attendanceTimes = document.getElementById('attendance-times');
const salarySummary = document.getElementById('salary-summary');
const checkinBtn = document.getElementById('checkin-btn');
const checkoutBtn = document.getElementById('checkout-btn');
const logoutBtn = document.getElementById('logout-btn');
const cameraPreview = document.getElementById('camera-preview');
const captureBtn = document.getElementById('capture-btn');
const capturedPhoto = document.getElementById('captured-photo');
const photoStatus = document.getElementById('photo-status');
const locationBtn = document.getElementById('location-btn');
const locationStatus = document.getElementById('location-status');
const mapLink = document.getElementById('map-link');
const announcementsList = document.getElementById('announcements-list');
const noAnnouncements = document.getElementById('no-announcements');
const complaintForm = document.getElementById('complaint-form');
const complaintMessage = document.getElementById('complaint-message');
const complaintStatus = document.getElementById('complaint-status');
const currentTime = document.getElementById('current-time');
const overtimeSummary = document.getElementById('overtime-summary');

const storageKey = 'vu_attendy_current';
let currentEmployee = null;
let clockInterval = null;

function loadCurrent() {
  const value = localStorage.getItem(storageKey);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function saveCurrent(employee) {
  localStorage.setItem(storageKey, JSON.stringify(employee));
}

function clearCurrent() {
  localStorage.removeItem(storageKey);
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    photoStatus.textContent = 'Camera not supported in this browser.';
    return;
  }

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      cameraPreview.srcObject = stream;
    })
    .catch(() => {
      photoStatus.textContent = 'Cannot access camera. Grant permission and try again.';
    });
}

function showDashboard() {
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  updateDashboard();
  updateCurrentTime();
  if (!clockInterval) {
    clockInterval = setInterval(updateCurrentTime, 1000);
  }
  fetchAnnouncements();
  startCamera();
}

function updateCurrentTime() {
  if (!currentTime) return;
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
  currentTime.textContent = `${date} • ${time}`;
}

function showLogin() {
  dashboardSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

async function fetchAnnouncements() {
  try {
    const announcements = await requestJson('/api/announcements');
    if (!announcements.length) {
      noAnnouncements.classList.remove('hidden');
      announcementsList.innerHTML = '';
      return;
    }

    noAnnouncements.classList.add('hidden');
    announcementsList.innerHTML = announcements.map(announcement => {
      const date = new Date(announcement.createdAt).toLocaleDateString();
      return `<li><strong>${date}</strong><p>${announcement.message}</p></li>`;
    }).join('');
  } catch (error) {
    noAnnouncements.textContent = 'Unable to load messages.';
  }
}

async function loadAttendanceRecords() {
  if (!currentEmployee) return [];
  return requestJson(`/api/attendance/${encodeURIComponent(currentEmployee.id)}`);
}

async function updateDashboard() {
  if (!currentEmployee) return;

  welcomeTitle.textContent = `Welcome, ${currentEmployee.name}`;
  employeeInfo.textContent = `Employee ID: ${currentEmployee.id}`;

  try {
    const records = await loadAttendanceRecords();
    const today = new Date().toDateString();
    const todayRecord = records.find(r => new Date(r.loginTime).toDateString() === today);

    if (!todayRecord) {
      attendanceStatus.textContent = 'Not checked in yet';
      attendanceTimes.textContent = '';
      checkinBtn.disabled = false;
      checkoutBtn.disabled = true;
    } else {
      attendanceStatus.textContent = todayRecord.logoutTime ? 'Checked out' : 'Checked in';
      attendanceTimes.textContent = `Login: ${formatTime(todayRecord.loginTime)}${todayRecord.logoutTime ? ` • Logout: ${formatTime(todayRecord.logoutTime)}` : ''}`;
      checkinBtn.disabled = !!todayRecord.loginTime;
      checkoutBtn.disabled = !todayRecord.loginTime || !!todayRecord.logoutTime;
    }

    const totalMinutes = records.reduce((sum, record) => {
      if (!record.logoutTime) return sum;
      const duration = Math.max(0, new Date(record.logoutTime) - new Date(record.loginTime));
      return sum + Math.floor(duration / 60000);
    }, 0);

    const hours = totalMinutes / 60;
    const amount = (hours * currentEmployee.hourlyRate).toFixed(0);
    const overtimeHours = Math.max(0, hours - 8).toFixed(2);
    const overtimePay = overtimeHours > 0 ? (overtimeHours * currentEmployee.hourlyRate * 1.25).toFixed(0) : '0';
    salarySummary.textContent = `${amount} PKR · ${hours.toFixed(2)} hrs`;
    overtimeSummary.textContent = overtimeHours > 0 ? `Overtime: ${overtimeHours} hrs · +${overtimePay} PKR` : 'No overtime yet';
  } catch (error) {
    attendanceStatus.textContent = 'Unable to load attendance.';
    attendanceTimes.textContent = '';
  }
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  loginError.textContent = '';

  const employeeId = document.getElementById('employee-id').value.trim();
  const password = document.getElementById('employee-pass').value.trim();

  try {
    const employee = await requestJson('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, password })
    });

    currentEmployee = employee;
    saveCurrent(employee);
    showDashboard();
  } catch (error) {
    loginError.textContent = error.message;
  }
});

checkinBtn.addEventListener('click', async () => {
  if (!currentEmployee) return;
  try {
    await requestJson('/api/attendance/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: currentEmployee.id })
    });
    updateDashboard();
  } catch (error) {
    attendanceStatus.textContent = error.message;
  }
});

checkoutBtn.addEventListener('click', async () => {
  if (!currentEmployee) return;
  try {
    await requestJson('/api/attendance/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: currentEmployee.id })
    });
    updateDashboard();
  } catch (error) {
    attendanceStatus.textContent = error.message;
  }
});

logoutBtn.addEventListener('click', () => {
  clearCurrent();
  currentEmployee = null;
  showLogin();
});

captureBtn.addEventListener('click', async () => {
  if (!navigator.mediaDevices?.getUserMedia || !currentEmployee) return;
  const canvas = document.createElement('canvas');
  canvas.width = cameraPreview.videoWidth;
  canvas.height = cameraPreview.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(cameraPreview, 0, 0);
  const dataUrl = canvas.toDataURL('image/png');
  capturedPhoto.src = dataUrl;
  capturedPhoto.classList.remove('hidden');
  photoStatus.textContent = 'Photo captured successfully.';

  try {
    await requestJson('/api/attendance/photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: currentEmployee.id, photo: dataUrl })
    });
  } catch (error) {
    photoStatus.textContent = error.message;
  }
});

locationBtn.addEventListener('click', () => {
  if (!navigator.geolocation || !currentEmployee) {
    locationStatus.textContent = 'Location not supported.';
    return;
  }

  locationStatus.textContent = 'Getting location...';
  navigator.geolocation.getCurrentPosition(async position => {
    const { latitude, longitude } = position.coords;
    try {
      await requestJson('/api/attendance/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: currentEmployee.id, latitude, longitude })
      });
      locationStatus.textContent = `Location shared: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      mapLink.href = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      mapLink.classList.remove('hidden');
    } catch (error) {
      locationStatus.textContent = error.message;
    }
  }, () => {
    locationStatus.textContent = 'Unable to obtain location. Allow permissions and try again.';
  });
});

complaintForm.addEventListener('submit', async event => {
  event.preventDefault();
  complaintStatus.textContent = '';

  if (!currentEmployee) return;

  try {
    await requestJson('/api/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: currentEmployee.id,
        message: complaintMessage.value.trim()
      })
    });

    complaintMessage.value = '';
    complaintStatus.textContent = 'Complaint sent to head office.';
  } catch (error) {
    complaintStatus.textContent = error.message;
  }
});

window.addEventListener('load', async () => {
  const saved = loadCurrent();
  if (saved) {
    currentEmployee = saved;
    showDashboard();
    return;
  }
  showLogin();
});
