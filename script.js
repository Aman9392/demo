// Mobile menu toggle
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav');

navToggle.addEventListener('click', () => {
  nav.classList.toggle('active');
  navToggle.innerHTML = nav.classList.contains('active') ? '×' : '☰';
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
  if (!nav.contains(e.target) && !navToggle.contains(e.target) && nav.classList.contains('active')) {
    nav.classList.remove('active');
    navToggle.innerHTML = '☰';
  }
});

// Handle booking form submission
function handleBooking(event) {
  event.preventDefault();
  // Add your booking logic here
  alert('This is a demo. In a real application, this would send the booking request to your backend.');
  return false;
}

// Fade-in animation on scroll
const fadeElems = document.querySelectorAll('.fade-in');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, {
  threshold: 0.1
});

fadeElems.forEach(elem => observer.observe(elem));

// WhatsApp button behavior (Contact box + floating button)
function openWhatsAppLink(href, event) {
  const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
  if (!isMobile) {
    // open WhatsApp Web in a new popup window
    event.preventDefault();
    const webUrl = href.replace('wa.me', 'web.whatsapp.com/send');
    window.open(webUrl, '_blank', 'noopener,noreferrer,width=900,height=700');
  }
}

// handle contact button(s)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn.whatsapp');
  if (btn && btn.tagName === 'A') {
    openWhatsAppLink(btn.getAttribute('href'), e);
  }
  // floating button
  const floatBtn = e.target.closest('#whatsappBtn');
  if (floatBtn && floatBtn.tagName === 'A') {
    openWhatsAppLink(floatBtn.getAttribute('href'), e);
  }
});