// Mobile menu toggle with improved handling
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav');
const body = document.body;
let isAnimating = false;

function toggleNav() {
  if (isAnimating) return;
  isAnimating = true;

  const isActive = nav.classList.contains('active');
  
  // First, ensure the nav is displayed if we're opening it
  if (!isActive) {
    nav.style.display = 'flex';
    // Small delay to ensure display: flex is applied before animation
    setTimeout(() => {
      nav.classList.add('active');
    }, 10);
  } else {
    nav.classList.remove('active');
    // Wait for transition to finish before hiding
    setTimeout(() => {
      nav.style.display = 'none';
    }, 300);
  }

  navToggle.innerHTML = !isActive ? '×' : '☰';
  body.style.overflow = !isActive ? 'hidden' : '';
  
  // Reset animation flag after transition
  setTimeout(() => {
    isAnimating = false;
  }, 300);
}

navToggle.addEventListener('click', toggleNav);

// Improved outside click handling
nav.addEventListener('click', (e) => {
  // Close menu when clicking nav links
  if (e.target.tagName === 'A') {
    toggleNav();
  }
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
  if (!nav.contains(e.target) && !navToggle.contains(e.target) && nav.classList.contains('active')) {
    toggleNav();
  }
});

// Handle escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && nav.classList.contains('active')) {
    toggleNav();
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