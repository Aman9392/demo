// Google Apps Script Web App Configuration
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzXcUxgFCKUXeOdKSEY_V74bJmO99_Ae5Ihpehf_YjT_4OHxkD-Hpkv0783Yv9XfvKMIw/exec'; // You'll need to replace this with your deployed web app URL

// Business Hours Configuration
const BUSINESS_HOURS = {
    start: 10, // 10 AM
    end: 19,   // 7 PM
    interval: 60, // 60 minutes per slot
    excludeDays: [0] // Sunday (0 = Sunday, 6 = Saturday)
};

class BookingCalendar {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.selectedTime = null;
        this.bookedSlots = new Map();
        // Note: initialization (fetching booked slots + rendering) is started
        // explicitly from the page load handler to ensure the fetch happens
        // before users can interact with the calendar.
    }

    async initialize() {
        // First fetch booked slots
        await this.fetchBookedSlots();
        // Then initialize the calendar
        this.initializeCalendar();
    }

    initializeCalendar() {
        // Initialize calendar elements
        this.prevButton = document.getElementById('prevMonth');
        this.nextButton = document.getElementById('nextMonth');
        this.currentMonthElement = document.getElementById('currentMonth');
        this.calendarDates = document.getElementById('calendarDates');
        this.timeSlotsContainer = document.getElementById('timeSlots');

        // Add event listeners with async handling
        this.prevButton.addEventListener('click', async () => await this.changeMonth(-1));
        this.nextButton.addEventListener('click', async () => await this.changeMonth(1));
        
        // Initial render
        this.renderCalendar();
    }

    async fetchBookedSlots() {
        try {
            console.log('Fetching booked slots from:', SCRIPT_URL + '?action=getBookings');
            const response = await fetch(SCRIPT_URL + '?action=getBookings');
            const result = await response.json();
            console.log('Raw API response:', result);
            
            if (result.status !== 'success' || !result.data) {
                console.error('Failed to fetch bookings:', result);
                return;
            }

            this.bookedSlots.clear();
            result.data.forEach(booking => {
                console.log('Raw booking data:', booking);
                
                if (booking.date && booking.time) {
                    // Convert the date to YYYY-MM-DD format
                    let dateStr = booking.date;
                    if (booking.date.includes('T')) {
                        const date = new Date(booking.date);
                        dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    }

                // Convert the time to HH:mm format
                let timeStr;
                try {
                    if (booking.time && booking.time.includes('T')) {
                        // Parse the time from the ISO string
                        const timeDate = new Date(booking.time);
                        const hours = timeDate.getHours();
                        const minutes = timeDate.getMinutes();
                        timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                        console.log('Converted ISO time:', booking.time, 'to:', timeStr);
                    } else if (booking.time && booking.time.includes(':')) {
                        // Already in HH:mm format
                        timeStr = booking.time.split(':').slice(0, 2).join(':');
                        console.log('Using existing time format:', timeStr);
                    } else if (!isNaN(parseFloat(booking.time))) {
                        const timeValue = parseFloat(booking.time);
                        const totalMinutes = Math.round(timeValue * 24 * 60);
                        const hours = Math.floor(totalMinutes / 60);
                        const minutes = totalMinutes % 60;
                        timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                        console.log('Converted numeric time:', booking.time, 'to:', timeStr);
                    }
                } catch (error) {
                    console.error('Error converting time:', booking.time, error);
                    return null;
                }                    if (dateStr && timeStr) {
                        // Store with exact format for matching
                        const key = `${dateStr}-${timeStr}`;
                        console.log('Processing booking into:', { key, date: dateStr, time: timeStr });
                        
                        this.bookedSlots.set(key, {
                            ...booking,
                            date: dateStr,
                            time: timeStr
                        });
                    }
                }
            });

            console.log('Final booked slots:', Array.from(this.bookedSlots.entries()));
        } catch (error) {
            console.error('Error fetching booked slots:', error);
        }
    }

    getDateTimeKey(date) {
        // Format: "YYYY-MM-DD-HH:mm" in local timezone
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        const key = `${year}-${month}-${day}-${hours}:${minutes}`;
        console.log('Generated key for date:', date.toLocaleString(), 'Key:', key);
        return key;
    }

    renderCalendar() {
        // Update month display
        const monthYear = this.currentDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });
        this.currentMonthElement.textContent = monthYear;

        // Clear previous dates
        this.calendarDates.innerHTML = '';

        // Get first day of month and total days
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        
        // Add empty cells for days before first day of month
        for (let i = 0; i < firstDay.getDay(); i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'date-cell disabled';
            this.calendarDates.appendChild(emptyCell);
        }

        // Add date cells
        for (let date = 1; date <= lastDay.getDate(); date++) {
            const dateCell = document.createElement('div');
            dateCell.className = 'date-cell';
            dateCell.textContent = date;

            const cellDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), date);
            
            // Disable past dates and excluded days
            if (cellDate < new Date().setHours(0,0,0,0) || 
                BUSINESS_HOURS.excludeDays.includes(cellDate.getDay())) {
                dateCell.classList.add('disabled');
            } else {
                dateCell.addEventListener('click', () => this.selectDate(cellDate));
                
                // Check if date has available slots
                if (this.hasAvailableSlots(cellDate)) {
                    dateCell.classList.add('has-slots');
                }
            }

            // Mark selected date
            if (this.selectedDate && cellDate.toDateString() === this.selectedDate.toDateString()) {
                dateCell.classList.add('selected');
            }

            this.calendarDates.appendChild(dateCell);
        }
    }

    hasAvailableSlots(date) {
        const totalSlots = this.generateTimeSlots(date).length;
        let bookedCount = 0;

        const datePrefix = this.getDateTimeKey(date).split('-').slice(0, 3).join('-');
        console.log('Checking available slots for date prefix:', datePrefix);
        
        this.bookedSlots.forEach((booking, key) => {
            if (key.startsWith(datePrefix)) {
                console.log('Found booked slot:', key);
                bookedCount++;
            }
        });

        console.log(`Date ${datePrefix}: ${bookedCount} booked out of ${totalSlots} total slots`);
        return bookedCount < totalSlots;
    }

    generateTimeSlots(date) {
        const slots = [];
        const startHour = BUSINESS_HOURS.start;
        const endHour = BUSINESS_HOURS.end;
        const interval = BUSINESS_HOURS.interval;

        for (let hour = startHour; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += interval) {
                const slotDate = new Date(date);
                slotDate.setHours(hour, minute, 0, 0);
                
                // Skip slots in the past
                if (slotDate > new Date()) {
                    slots.push(slotDate);
                }
            }
        }

        return slots;
    }

    renderTimeSlots(date) {
        this.timeSlotsContainer.innerHTML = '';
        console.log('Rendering time slots for date:', date);
        const slots = this.generateTimeSlots(date);
        console.log('Generated slots:', slots.map(s => s.toISOString()));

        // Get all booked slots for debugging
        const bookedSlots = Array.from(this.bookedSlots.entries());
        console.log('Current booked slots:', bookedSlots);

        slots.forEach(slot => {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            
            // Format display time (12-hour)
            const timeString = slot.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            timeSlot.textContent = timeString;

            // Format time for comparison (24-hour)
            const hours = String(slot.getHours()).padStart(2, '0');
            const minutes = String(slot.getMinutes()).padStart(2, '0');
            const slotTime = `${hours}:${minutes}`;
            
            // Format date for comparison
            const slotDate = `${slot.getFullYear()}-${String(slot.getMonth() + 1).padStart(2, '0')}-${String(slot.getDate()).padStart(2, '0')}`;

            // Check if slot is booked
            const isBooked = bookedSlots.some(([_, booking]) => {
                const bookingDate = booking.date.split('T')[0] || booking.date;
                const bookingTime = booking.time.split('T')[1] || booking.time;
                
                console.log('Comparing slot:', {
                    slotDate,
                    slotTime,
                    bookingDate,
                    bookingTime,
                    rawBooking: booking
                });
                
                const timeMatches = bookingTime === slotTime;
                console.log(`Time comparison: ${bookingTime} === ${slotTime} = ${timeMatches}`);
                
                const dateMatches = bookingDate === slotDate;
                console.log(`Date comparison: ${bookingDate} === ${slotDate} = ${dateMatches}`);
                
                return dateMatches && timeMatches;
            });

            console.log(`Slot ${slotDate} ${slotTime} isBooked:`, isBooked);

            if (isBooked) {
                timeSlot.classList.add('booked');
                timeSlot.title = 'This slot is already booked';
                const bookedIcon = document.createElement('span');
                bookedIcon.className = 'booked-icon';
                bookedIcon.textContent = ' 🔒';
                timeSlot.appendChild(bookedIcon);
            } else {
                timeSlot.addEventListener('click', () => this.selectTimeSlot(slot, timeSlot));
            }

            if (this.selectedTime && this.selectedTime.getTime() === slot.getTime()) {
                timeSlot.classList.add('selected');
            }

            this.timeSlotsContainer.appendChild(timeSlot);
        });
    }

    selectDate(date) {
        this.selectedDate = date;
        document.getElementById('selectedDate').textContent = date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });
        this.renderCalendar();
        this.renderTimeSlots(date);
    }

    selectTimeSlot(dateTime, element) {
        // Remove previous selection
        const previousSelected = this.timeSlotsContainer.querySelector('.time-slot.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }

        // Add new selection
        element.classList.add('selected');
        this.selectedTime = dateTime;

        // Format time in 24-hour format
        const hours = dateTime.getHours();
        const minutes = dateTime.getMinutes();
        const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        
        // Format for display (12-hour format)
        const displayTime = new Date(dateTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        // Update displays
        document.getElementById('selectedTime').textContent = displayTime;
        document.getElementById('selectedDateTime').value = timeStr;
        
        console.log('Selected time:', {
            display: displayTime,
            value: timeStr,
            date: dateTime.toISOString()
        });
    }

    async changeMonth(delta) {
        this.currentDate = new Date(
            this.currentDate.getFullYear(),
            this.currentDate.getMonth() + delta,
            1
        );
        // Refresh booked slots before rendering calendar
        await this.fetchBookedSlots();
        this.renderCalendar();
    }
}

// Alert handling function
function showAlert(message, type = 'success') {
    const alert = document.querySelector('.custom-alert');
    alert.textContent = message;
    alert.className = 'custom-alert ' + type;
    alert.style.display = 'block';
    alert.classList.add('show');

    // Hide alert after 3 seconds
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => {
            alert.style.display = 'none';
        }, 300);
    }, 3000);
}

// Initialize booking form handling
document.addEventListener('DOMContentLoaded', async () => {
    // Create calendar instance, then explicitly initialize it so booked slots
    // are fetched before allowing interactions.
    const calendar = new BookingCalendar();
    await calendar.initialize();

    document.getElementById('bookingForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!calendar.selectedDate || !calendar.selectedTime) {
            showAlert('Please select a date and time for your appointment', 'error');
            return;
        }

        const formData = new FormData(e.target);
        const loadingSpinner = document.querySelector('.loading-spinner');
        
        // Get the selected date
        const selectedDate = calendar.selectedDate;
        // Get the time directly (already in correct format HH:mm)
        const timeStr = formData.get('selectedDateTime');
        
        // Format date as YYYY-MM-DD
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        const bookingData = {
            name: formData.get('name'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            service: formData.get('service'),
            message: formData.get('message'),
            date: formattedDate,
            time: timeStr
        };

        try {
            // Show loading spinner
            loadingSpinner.style.display = 'block';
            
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify(bookingData)
            });

            showAlert('Booking submitted successfully!');
            calendar.fetchBookedSlots(); // Refresh booked slots
            e.target.reset();
            
            // Reset selection displays
            document.getElementById('selectedDate').textContent = 'Not selected';
            document.getElementById('selectedTime').textContent = 'Not selected';
            calendar.selectedDate = null;
            calendar.selectedTime = null;
            calendar.renderCalendar();
            
        } catch (error) {
            console.error('Error submitting booking:', error);
            showAlert('There was an error submitting your booking. Please try again.', 'error');
        } finally {
            // Hide loading spinner
            loadingSpinner.style.display = 'none';
        }
    });
});