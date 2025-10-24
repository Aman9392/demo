// Google Apps Script code to be deployed as a web app
function doGet(e) {
  if (e.parameter && e.parameter.action === 'getBookings') {
    return getBookings();
  }
  return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Invalid action'})).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    // Administrative actions
    if (data && data.action === 'updateStatus') {
      const ok = updateBookingStatus(data.bookingId, data.status);
      return ContentService.createTextOutput(JSON.stringify({status: ok ? 'success' : 'error', message: ok ? 'Status updated' : 'Booking not found'})).setMimeType(ContentService.MimeType.JSON);
    }

    if (data && data.action === 'deleteBooking') {
      const ok = deleteBooking(data.bookingId);
      return ContentService.createTextOutput(JSON.stringify({status: ok ? 'success' : 'error', message: ok ? 'Booking deleted' : 'Booking not found'})).setMimeType(ContentService.MimeType.JSON);
    }

    // Default: create new booking
    return saveBooking(data);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
function doPost(e) {
  try {
    let data;
    
    // Handle both form-encoded and JSON data
    if (e.postData.type === "application/x-www-form-urlencoded") {
      data = e.parameter;
    } else {
      data = JSON.parse(e.postData.contents);
    }
    
    Logger.log("Received data: " + JSON.stringify(data));
    
    // Administrative actions
    if (data.action === 'updateStatus') {
      const ok = updateBookingStatus(data.bookingId, data.status);
      return ContentService.createTextOutput(JSON.stringify({
        status: ok ? 'success' : 'error', 
        message: ok ? 'Status updated' : 'Booking not found'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'deleteBooking') {
      const ok = deleteBooking(data.bookingId);
      return ContentService.createTextOutput(JSON.stringify({
        status: ok ? 'success' : 'error', 
        message: ok ? 'Booking deleted' : 'Booking not found'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Default: create new booking
    return saveBooking(data);
  } catch (error) {
    Logger.log("Error in doPost: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
// Delete a booking by Booking ID
function deleteBooking(bookingId) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('Appointments');
  if (!sheet) {
    Logger.log('deleteBooking: Appointments sheet not found.');
    return false;
  }
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === bookingId) {
      sheet.deleteRow(i + 1);
      Logger.log('Deleted booking ' + bookingId);
      return true;
    }
  }
  return false;
}

function getBookings() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('Appointments');
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Appointments sheet not found. Run setupSheet()'})).setMimeType(ContentService.MimeType.JSON);
  }
  const data = sheet.getDataRange().getValues();
  const bookings = [];

  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // row indexes (0-based): 0=Booking ID,1=Date,2=Time,3=Name,4=Phone,5=Email,6=Service,7=Message,8=Status
    // Format the time from the sheet to match the Google Sheets display format
    let timeValue = row[2];
    if (timeValue) {
      const date = new Date();
      if (typeof timeValue === 'number') {
        // If it's a decimal time value
        const totalMinutes = Math.round(timeValue * 24 * 60);
        date.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60);
      } else if (timeValue instanceof Date) {
        date.setHours(timeValue.getHours(), timeValue.getMinutes());
      }
      timeValue = Utilities.formatDate(date, "Asia/Kolkata", "hh:mm a");
    }

    bookings.push({
      id: row[0],
      date: row[1],
      time: timeValue, // Now in "hh:mm AM/PM" format
      name: row[3],
      phone: row[4],
      email: row[5],
      service: row[6],
      message: row[7],
      status: row[8]
    });
  }

  return ContentService.createTextOutput(JSON.stringify({status: 'success', data: bookings})).setMimeType(ContentService.MimeType.JSON);
}

function saveBooking(data) {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName('Appointments');
  if (!sheet) {
    // If sheet doesn't exist, create and setup
    sheet = ss.insertSheet('Appointments');
    // Minimal header setup if setupSheet() wasn't run
    sheet.getRange(1,1,1,10).setValues([['Booking ID','Date','Time','Name','Phone','Email','Service','Message','Status','Created At']]);
    sheet.setFrozenRows(1);
  }

  // Generate booking ID
  const bookingId = 'BK' + new Date().getTime().toString().slice(-6) + Math.random().toString(36).substring(2,5).toUpperCase();

    // Convert time to proper format if needed
  let time = data.time;
  if (time) {
    // If it's an ISO string like "1899-12-30T05:38:50.000Z"
    if (time.includes('T')) {
      const date = new Date(time);
      // Format as "hh:mm AM/PM" in India timezone
      time = Utilities.formatDate(date, "Asia/Kolkata", "hh:mm a");
    }
    // If it's already in HH:mm format
    else if (time.includes(':')) {
      const [hours, minutes] = time.split(':').map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        const date = new Date();
        date.setHours(hours, minutes);
        time = Utilities.formatDate(date, "Asia/Kolkata", "hh:mm a");
      }
    }
  }  // The date is already in YYYY-MM-DD format
  const date = data.date;

  const newRow = [
    bookingId,
    date,
    time,
    data.name || '',
    data.phone || '',
    data.email || '',
    data.service || '',
    data.message || '',
    'Pending',
    new Date()
  ];

  sheet.appendRow(newRow);

  return ContentService.createTextOutput(JSON.stringify({status:'success',message:'Booking saved successfully',bookingId: bookingId})).setMimeType(ContentService.MimeType.JSON);
}

// Setup function to initialize the sheet if needed
function setupSheet() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName('Appointments');
  if (!sheet) sheet = ss.insertSheet('Appointments');

  const headers = ['Booking ID','Date','Time','Name','Phone','Email','Service','Message','Status','Created At'];
  sheet.clear();
  sheet.getRange(1,1,1,headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1,10,120);
  
  // Set the timezone for the spreadsheet to India time
  SpreadsheetApp.setSpreadsheetTimeZone('Asia/Kolkata');
  
  // Set date and time formats
  sheet.getRange('B:B').setNumberFormat('yyyy-mm-dd');
  sheet.getRange('C:C').setNumberFormat('hh:mm AM/PM');  // 12-hour format with AM/PM
  sheet.getRange('J:J').setNumberFormat('yyyy-mm-dd HH:mm:ss');
  return ContentService.createTextOutput(JSON.stringify({status:'success',message:'Appointments sheet initialized'})).setMimeType(ContentService.MimeType.JSON);
}

// Helper function to format time from decimal to HH:mm format
function formatTime(decimalTime) {
  if (typeof decimalTime === 'number') {
    const totalMinutes = Math.round(decimalTime * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  return decimalTime;
}