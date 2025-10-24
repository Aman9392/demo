// Add this to your Google Apps Script file

// Function to test both email and status tracking
function testBookingSystem() {
  // 1. Test booking creation
  const testBooking = {
    name: "Test User",
    email: "your.email@gmail.com", // Replace with your email
    phone: "1234567890",
    service: "Hair Styling",
    datetime: new Date().toISOString(),
    message: "Test booking"
  };

  // 2. Create test booking
  const result = saveBooking(testBooking);

  // saveBooking returns a ContentService TextOutput. Safely extract JSON if present.
  let bookingId = null;
  try {
    if (result && typeof result.getContent === 'function') {
      const payload = JSON.parse(result.getContent());
      bookingId = payload.bookingId || null;
      Logger.log("Booking created (payload): " + JSON.stringify(payload));
    } else {
      Logger.log("saveBooking did not return a TextOutput. Raw result: " + JSON.stringify(result));
    }
  } catch (err) {
    Logger.log('Failed to parse saveBooking result: ' + err.toString());
  }

  // 3. Update booking status (only if we have an id)
  if (bookingId) {
    const ok = updateBookingStatus(bookingId, "Confirmed");
    Logger.log('updateBookingStatus returned: ' + ok);
  } else {
    Logger.log('No bookingId available from saveBooking; skipping status update.');
  }

  return "Test completed. Check logs for details.";
}

// Function to update booking status
function updateBookingStatus(bookingId, newStatus) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName("Appointments");
  if (!sheet) {
    Logger.log('updateBookingStatus: Appointments sheet not found. Run setupSheet() first.');
    return false;
  }
  
  // Find the booking
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === bookingId) { // First column is Booking ID
      // Update status
      sheet.getRange(i + 1, 9).setValue(newStatus); // Column I (9) is Status
      
      // Log the change
      Logger.log(`Updated booking ${bookingId} status to ${newStatus}`);
      
      // Send status update email
      sendStatusUpdateEmail(data[i][3], data[i][5], bookingId, newStatus);
      return true;
    }
  }
  Logger.log(`Booking ${bookingId} not found`);
  return false;
}

// Function to send status update emails
function sendStatusUpdateEmail(name, email, bookingId, status) {
  const subject = `Appointment Status Update - ${bookingId}`;
  const body = `
    Dear ${name},

    Your appointment status has been updated.

    Booking ID: ${bookingId}
    New Status: ${status}

    ${getStatusMessage(status)}

    If you have any questions, please contact us at +918839739068.

    Best regards,
    Midden Aesthetics Team
  `;

  try {
    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: body
    });
    Logger.log(`Status update email sent to ${email}`);
    return true;
  } catch (error) {
    Logger.log(`Failed to send status update email: ${error.toString()}`);
    return false;
  }
}

// Helper function for status-specific messages
function getStatusMessage(status) {
  switch(status) {
    case 'Confirmed':
      return "Your appointment has been confirmed. We look forward to seeing you!";
    case 'Completed':
      return "Thank you for visiting us. We hope you enjoyed our services!";
    case 'Cancelled':
      return "Your appointment has been cancelled. Please contact us if this was not intended.";
    default:
      return "Please contact us if you have any questions about your appointment.";
  }
}

// Function to get booking status
function getBookingStatus(bookingId) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName("Appointments");
  if (!sheet) {
    Logger.log('getBookingStatus: Appointments sheet not found. Run setupSheet() first.');
    return null;
  }
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === bookingId) {
      return {
        bookingId: bookingId,
        status: data[i][8],
        name: data[i][3],
        date: data[i][1],
        time: data[i][2],
        service: data[i][6]
      };
    }
  }
  return null;
}