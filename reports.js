const employeeStorageKey = 'vu_attendy_current_employee';
const reportTitle = document.getElementById('report-title');
const reportSummary = document.getElementById('report-summary');
const reportContent = document.getElementById('report-content');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const generateReportBtn = document.getElementById('generate-report-btn');
const printBtn = document.getElementById('print-btn');
const backBtn = document.getElementById('back-btn');

let currentEmployee = null;

function loadEmployee() {
  const saved = localStorage.getItem(employeeStorageKey);
  if (!saved) {
    window.location.href = 'index.html';
    return null;
  }
  try {
    return JSON.parse(saved);
  } catch {
    window.location.href = 'index.html';
    return null;
  }
}

async function generateReport() {
  if (!currentEmployee) return;

  const startDate = startDateInput.value;
  const endDate = endDateInput.value;

  if (!startDate || !endDate) {
    alert('Please select both start and end dates');
    return;
  }

  if (new Date(startDate) > new Date(endDate)) {
    alert('Start date must be before end date');
    return;
  }

  try {
    const params = new URLSearchParams({
      startDate,
      endDate
    });

    const response = await fetch(`/api/attendance/report/${currentEmployee.id}?${params}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate report');
    }

    displayReport(data);
  } catch (error) {
    reportContent.innerHTML = `<div class="message error">${error.message}</div>`;
  }
}

function displayReport(data) {
  const { employee, summary, records } = data;

  reportTitle.textContent = `Attendance Report - ${employee.name} (${employee.id})`;

  // Update summary
  document.getElementById('total-days').textContent = summary.totalDays;
  document.getElementById('present-days').textContent = summary.presentDays;
  document.getElementById('total-hours').textContent = `${summary.totalHours}h`;
  document.getElementById('est-salary').textContent = `${summary.estimatedSalary} PKR`;
  reportSummary.style.display = 'grid';

  // Create table
  if (records.length === 0) {
    reportContent.innerHTML = '<p class="no-data">No attendance records found for the selected period.</p>';
    return;
  }

  const tableHTML = `
    <table class="attendance-records">
      <thead>
        <tr>
          <th>Date</th>
          <th>Check In</th>
          <th>Check Out</th>
          <th>Hours Worked</th>
          <th>Status</th>
          <th>Location</th>
        </tr>
      </thead>
      <tbody>
        ${records.map(record => {
          let hoursWorked = '—';
          let status = 'Absent';
          
          if (record.loginTime && record.logoutTime) {
            const login = new Date(record.loginTime);
            const logout = new Date(record.logoutTime);
            const hours = ((logout - login) / (1000 * 60 * 60)).toFixed(2);
            hoursWorked = `${hours}h`;
            status = 'Present';
          } else if (record.loginTime) {
            status = 'Checked In';
          }

          const loginTime = record.loginTime ? new Date(record.loginTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';
          const logoutTime = record.logoutTime ? new Date(record.logoutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';
          const location = record.location ? `${record.location.latitude.toFixed(4)}, ${record.location.longitude.toFixed(4)}` : '—';

          return `
            <tr>
              <td>${record.date}</td>
              <td>${loginTime}</td>
              <td>${logoutTime}</td>
              <td>${hoursWorked}</td>
              <td>${status}</td>
              <td>${location}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  reportContent.innerHTML = tableHTML;
}

generateReportBtn.addEventListener('click', generateReport);

printBtn.addEventListener('click', () => {
  window.print();
});

backBtn.addEventListener('click', () => {
  window.location.href = 'index.html';
});

// Set default date range (last 30 days)
window.addEventListener('load', () => {
  currentEmployee = loadEmployee();
  
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  endDateInput.value = today.toISOString().split('T')[0];
  startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
});
