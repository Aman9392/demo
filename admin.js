// Replace with your deployed Apps Script Web App URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzXcUxgFCKUXeOdKSEY_V74bJmO99_Ae5Ihpehf_YjT_4OHxkD-Hpkv0783Yv9XfvKMIw/exec'; // Replace this with the URL from your new deployment
async function fetchBookings() {
  try {
    console.log('Fetching bookings from', SCRIPT_URL + '?action=getBookings');
    const res = await fetch(SCRIPT_URL + '?action=getBookings');
    console.log('Fetch response status:', res.status);
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} - ${txt}`);
    }
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON:', text);
      throw new Error('Invalid JSON response from server');
    }
    if (json.status !== 'success') throw new Error(json.message || 'Failed to load bookings');
    return json.data;
  } catch (err) {
    console.error('fetchBookings error:', err);
    throw err;
  }
}

function renderBookings(list) {
  const tbody = document.querySelector('#bookingsTable tbody');
  tbody.innerHTML = '';
  list.forEach(b => {
    // Convert time to 12-hour format if needed
    let timeString = b.time || '';
    try {
      if (timeString) {
        let hours, minutes;
        if (timeString.includes('T')) {
          // Handle ISO date string format with timezone conversion
          const dateObj = new Date(timeString);
          if (!isNaN(dateObj.getTime())) {
            const indiaTime = new Date(dateObj.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
            hours = indiaTime.getHours();
            minutes = indiaTime.getMinutes();
            console.log('Converted ISO time:', timeString, 'to:', hours + ':' + minutes);
          }
        } else if (timeString.includes(':')) {
          // Handle HH:mm format
          const timeParts = timeString.split(/[:\s]/);
          hours = parseInt(timeParts[0]);
          minutes = parseInt(timeParts[1]);
          // If time already includes AM/PM, adjust hours accordingly
          if (timeParts.length > 2) {
            const period = timeParts[2].toUpperCase();
            if (period === 'PM' && hours < 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
          }
        }

        if (!isNaN(hours) && !isNaN(minutes)) {
          const period = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours % 12 || 12;
          timeString = `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
          console.log('Formatted time:', timeString);
        }
      }
    } catch (error) {
      console.error('Error formatting time:', error, 'Original time:', b.time);
    }

    // Format date as DD/MM/YYYY
    let formattedDate = b.date;
    if (b.date) {
      // Handle both ISO date string and YYYY-MM-DD format
      let dateObj;
      if (b.date.includes('T')) {
        // If it's an ISO string
        dateObj = new Date(b.date);
      } else {
        // If it's YYYY-MM-DD format
        const [year, month, day] = b.date.split('-').map(Number);
        dateObj = new Date(year, month - 1, day);
      }
      
      if (!isNaN(dateObj.getTime())) {
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        formattedDate = `${day}/${month}/${year}`;
      }
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.id}</td>
      <td>${formattedDate}</td>
      <td>${timeString}</td>
      <td>${b.name}</td>
      <td>${b.phone}</td>
      <td>${b.email}</td>
      <td>${b.service}</td>
      <td class="message-cell" title="${escapeHtml(b.message || '')}">${escapeHtml(b.message || '')}</td>
      <td>
        <select class="select-status">
          <option ${b.status==='Pending'?'selected':''}>Pending</option>
          <option ${b.status==='Confirmed'?'selected':''}>Confirmed</option>
          <option ${b.status==='Completed'?'selected':''}>Completed</option>
          <option ${b.status==='Cancelled'?'selected':''}>Cancelled</option>
        </select>
      </td>
      <td class="actions">
        <button class="btn-confirm">Save</button>
        <button class="btn-delete">Delete</button>
      </td>
    `;

    // Save action
    tr.querySelector('.btn-confirm').addEventListener('click', async () => {
      try {
        const newStatus = tr.querySelector('.select-status').value;
        await updateStatus(b.id, newStatus);
        alert('Status updated successfully');
        await refresh();
      } catch (err) {
        console.error('Save action failed:', err);
        alert(err.message);
      }
    });

    // Delete action
    tr.querySelector('.btn-delete').addEventListener('click', async () => {
      try {
        if (!confirm('Delete booking ' + b.id + '?')) return;
        await deleteBooking(b.id);
        alert('Booking deleted successfully');
        await refresh();
      } catch (err) {
        console.error('Delete action failed:', err);
        alert(err.message);
      }
    });

    tbody.appendChild(tr);
  });
}

// (form-encoded updateStatus kept later in file)
async function updateStatus(bookingId, status) {
  try {
    console.log('Updating status:', bookingId, status);
    
    // Create a form data object to send as URL-encoded
    const formData = new URLSearchParams();
    formData.append('action', 'updateStatus');
    formData.append('bookingId', bookingId);
    formData.append('status', status);
    
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });
    
    console.log('Response status:', res.status);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const responseText = await res.text();
    console.log('Raw response:', responseText);
    
    let json;
    try {
      json = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response:', e);
      throw new Error('Invalid response from server');
    }
    
    console.log('Update response:', json);
    if (json.status !== 'success') throw new Error(json.message || 'Failed to update status');
    return json;
  } catch (err) {
    console.error('Error updating status:', err);
    throw new Error(`Failed to update status: ${err.message}`);
  }
}
// (form-encoded deleteBooking kept later in file)
async function deleteBooking(bookingId) {
  try {
    console.log('Deleting booking:', bookingId);
    
    // Create a form data object to send as URL-encoded
    const formData = new URLSearchParams();
    formData.append('action', 'deleteBooking');
    formData.append('bookingId', bookingId);
    
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });
    
    console.log('Response status:', res.status);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const responseText = await res.text();
    console.log('Raw response:', responseText);
    
    let json;
    try {
      json = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response:', e);
      throw new Error('Invalid response from server');
    }
    
    console.log('Delete response:', json);
    if (json.status !== 'success') throw new Error(json.message || 'Failed to delete booking');
    return json;
  } catch (err) {
    console.error('Error deleting booking:', err);
    throw new Error(`Failed to delete booking: ${err.message}`);
  }
}
function escapeHtml(unsafe) {
  return unsafe.replace(/[&<>"']/g, function(m) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
  });
}

// Filters & UI
async function refresh() {
  try {
    const all = await fetchBookings();
    console.log('Fetched bookings:', all);

    const search = document.getElementById('search')?.value?.trim()?.toLowerCase() || '';
    const statusFilter = document.getElementById('filterStatus')?.value;
    console.log('Search term:', search, 'Status filter:', statusFilter);

    let list = all || [];
    if (statusFilter && statusFilter !== 'all') {
      list = list.filter(x => x.status === statusFilter);
      console.log('After status filter:', list.length, 'bookings');
    }

    if (search) {
      list = list.filter(x => {
        const name = String(x.name || '').toLowerCase();
        const id = String(x.id || '').toLowerCase();
        const phone = String(x.phone || '').toLowerCase();
        const matches = name.includes(search) || id.includes(search) || phone.includes(search);
        console.log('Testing', {name, id, phone}, 'against', search, '=', matches);
        return matches;
      });
      console.log('After search filter:', list.length, 'bookings');
    }

    console.log('Final filtered list:', list);
    renderBookings(list);
  } catch (err) {
    console.error('Refresh error:', err);
    alert('Failed to load bookings: ' + err.message);
  }
}

// Add event listeners once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Setting up event listeners');
  const searchInput = document.getElementById('search');
  const filterStatus = document.getElementById('filterStatus');
  const refreshBtn = document.getElementById('refresh');

  if (!searchInput || !filterStatus || !refreshBtn) {
    console.error('Missing UI elements:', {
      search: !!searchInput,
      filter: !!filterStatus,
      refresh: !!refreshBtn
    });
    return;
  }

  refreshBtn.addEventListener('click', () => {
    console.log('Refresh clicked');
    refresh();
  });
  
  searchInput.addEventListener('input', () => {
    console.log('Search input:', searchInput.value);
    setTimeout(refresh, 300);
  });
  
  filterStatus.addEventListener('change', () => {
    console.log('Status filter changed:', filterStatus.value);
    refresh();
  });

  // Initial load
  refresh();
});