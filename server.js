const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const dataFile = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname)));

async function loadData() {
  try {
    const raw = await fs.readFile(dataFile, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    const initial = {
      employees: [
        { id: 'E1001', name: 'Ali Khan', password: '1234', hourlyRate: 300 },
        { id: 'E1002', name: 'Sara Ahmed', password: '1234', hourlyRate: 300 },
        { id: 'E1003', name: 'Omar Malik', password: '1234', hourlyRate: 300 }
      ],
      adminUsers: [
        { username: 'headoffice', password: 'office123', name: 'Head Office' }
      ],
      attendance: [],
      announcements: [],
      complaints: []
    };
    await fs.writeFile(dataFile, JSON.stringify(initial, null, 2));
    return initial;
  }
}

async function saveData(data) {
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
}

function todayDateString(date = new Date()) {
  return new Date(date).toLocaleDateString('en-GB');
}

function verifyAdmin(data, username, password) {
  return data.adminUsers.some(user => user.username === username && user.password === password);
}

app.post('/api/login', async (req, res) => {
  const { employeeId, password } = req.body;
  if (!employeeId || !password) {
    return res.status(400).json({ error: 'Employee ID and password are required.' });
  }

  const data = await loadData();
  const employee = data.employees.find(e => e.id === employeeId && e.password === password);
  if (!employee) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const { password: _, ...safeEmployee } = employee;
  res.json(safeEmployee);
});

app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const data = await loadData();
  if (!verifyAdmin(data, username, password)) {
    return res.status(401).json({ error: 'Admin credentials are invalid.' });
  }

  res.json({ username, name: 'Head Office' });
});

app.get('/api/employees', async (req, res) => {
  const { adminUser, adminPassword } = req.query;
  if (!adminUser || !adminPassword) {
    return res.status(401).json({ error: 'Admin credentials are required.' });
  }

  const data = await loadData();
  if (!verifyAdmin(data, adminUser, adminPassword)) {
    return res.status(401).json({ error: 'Admin credentials are invalid.' });
  }

  res.json(data.employees.map(({ password, ...rest }) => rest));
});

app.get('/api/announcements', async (req, res) => {
  const data = await loadData();
  const sorted = [...data.announcements].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sorted);
});

app.post('/api/announcements', async (req, res) => {
  const { username, password, message } = req.body;
  if (!username || !password || !message) {
    return res.status(400).json({ error: 'Admin credentials and message are required.' });
  }

  const data = await loadData();
  if (!verifyAdmin(data, username, password)) {
    return res.status(401).json({ error: 'Admin credentials are invalid.' });
  }

  const announcement = {
    id: `${Date.now()}`,
    message,
    createdAt: new Date().toISOString(),
    createdBy: username
  };
  data.announcements.push(announcement);
  await saveData(data);
  res.json(announcement);
});

app.post('/api/complaints', async (req, res) => {
  const { employeeId, message } = req.body;
  if (!employeeId || !message) {
    return res.status(400).json({ error: 'Employee ID and message are required.' });
  }

  const data = await loadData();
  const complaint = {
    id: `${Date.now()}`,
    employeeId,
    message,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };
  data.complaints.push(complaint);
  await saveData(data);
  res.json(complaint);
});

app.get('/api/complaints', async (req, res) => {
  const { adminUser, adminPassword } = req.query;
  if (!adminUser || !adminPassword) {
    return res.status(401).json({ error: 'Admin credentials are required.' });
  }

  const data = await loadData();
  if (!verifyAdmin(data, adminUser, adminPassword)) {
    return res.status(401).json({ error: 'Admin credentials are invalid.' });
  }

  const sorted = [...data.complaints].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sorted);
});

app.get('/api/attendance/:employeeId', async (req, res) => {
  const { employeeId } = req.params;
  const data = await loadData();
  const records = data.attendance.filter(r => r.employeeId === employeeId);
  res.json(records);
});

app.get('/api/attendance/all', async (req, res) => {
  const { adminUser, adminPassword } = req.query;
  if (!adminUser || !adminPassword) {
    return res.status(401).json({ error: 'Admin credentials are required.' });
  }

  const data = await loadData();
  if (!verifyAdmin(data, adminUser, adminPassword)) {
    return res.status(401).json({ error: 'Admin credentials are invalid.' });
  }

  res.json(data.attendance);
});

app.post('/api/attendance/checkin', async (req, res) => {
  const { employeeId } = req.body;
  if (!employeeId) return res.status(400).json({ error: 'Employee ID is required.' });

  const data = await loadData();
  const date = todayDateString();
  const existing = data.attendance.find(r => r.employeeId === employeeId && r.date === date);
  if (existing) {
    return res.status(400).json({ error: 'Already checked in today.' });
  }

  const record = {
    employeeId,
    date,
    loginTime: new Date().toISOString(),
    logoutTime: null,
    photo: null,
    location: null
  };
  data.attendance.push(record);
  await saveData(data);
  res.json(record);
});

app.post('/api/attendance/checkout', async (req, res) => {
  const { employeeId } = req.body;
  if (!employeeId) return res.status(400).json({ error: 'Employee ID is required.' });

  const data = await loadData();
  const date = todayDateString();
  const record = data.attendance.find(r => r.employeeId === employeeId && r.date === date);
  if (!record) {
    return res.status(400).json({ error: 'No check-in record found for today.' });
  }
  if (record.logoutTime) {
    return res.status(400).json({ error: 'Already checked out today.' });
  }

  record.logoutTime = new Date().toISOString();
  await saveData(data);
  res.json(record);
});

app.post('/api/attendance/photo', async (req, res) => {
  const { employeeId, photo } = req.body;
  if (!employeeId || !photo) return res.status(400).json({ error: 'Employee ID and photo are required.' });

  const data = await loadData();
  const date = todayDateString();
  const record = data.attendance.find(r => r.employeeId === employeeId && r.date === date);
  if (!record) {
    return res.status(400).json({ error: 'Attendance record not found for today.' });
  }

  record.photo = photo;
  await saveData(data);
  res.json(record);
});

app.post('/api/attendance/location', async (req, res) => {
  const { employeeId, latitude, longitude } = req.body;
  if (!employeeId || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'Employee ID and location are required.' });
  }

  const data = await loadData();
  const date = todayDateString();
  const record = data.attendance.find(r => r.employeeId === employeeId && r.date === date);
  if (!record) {
    return res.status(400).json({ error: 'Attendance record not found for today.' });
  }

  record.location = { latitude, longitude };
  await saveData(data);
  res.json(record);
});

app.get('/api/attendance/report/:employeeId', async (req, res) => {
  const { employeeId } = req.params;
  const { startDate, endDate } = req.query;
  
  if (!employeeId) {
    return res.status(400).json({ error: 'Employee ID is required.' });
  }

  const data = await loadData();
  const employee = data.employees.find(e => e.id === employeeId);
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found.' });
  }

  let records = data.attendance.filter(r => r.employeeId === employeeId);

  if (startDate) {
    records = records.filter(r => new Date(r.date) >= new Date(startDate));
  }
  if (endDate) {
    records = records.filter(r => new Date(r.date) <= new Date(endDate));
  }

  const totalDays = records.length;
  const presentDays = records.filter(r => r.loginTime).length;
  const absentDays = totalDays - presentDays;

  let totalHours = 0;
  records.forEach(r => {
    if (r.loginTime && r.logoutTime) {
      const login = new Date(r.loginTime);
      const logout = new Date(r.logoutTime);
      const hours = (logout - login) / (1000 * 60 * 60);
      totalHours += hours;
    }
  });

  const estimatedSalary = totalHours * employee.hourlyRate;

  res.json({
    employee: { id: employee.id, name: employee.name, hourlyRate: employee.hourlyRate },
    period: { startDate, endDate },
    summary: {
      totalDays,
      presentDays,
      absentDays,
      totalHours: totalHours.toFixed(2),
      estimatedSalary: Math.round(estimatedSalary)
    },
    records: records.sort((a, b) => new Date(a.date) - new Date(b.date))
  });
});

app.listen(port, () => {
  console.log(`VU Attendy server running at http://localhost:${port}`);
});
