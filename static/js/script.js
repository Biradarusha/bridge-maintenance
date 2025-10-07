// Navigation functionality
function toggleMenu() {
  document.getElementById("navbar").classList.toggle("active");
}

// Dropdown functionality for mobile
document.querySelectorAll(".dropdown > a").forEach(link => {
  link.addEventListener("click", function(e) {
    if (window.innerWidth <= 992) { 
      e.preventDefault();
      let parent = this.parentElement;
      parent.classList.toggle("show");
    }
  });
});

// Lightbox configuration
if (typeof lightbox !== 'undefined') {
  lightbox.option({
    'resizeDuration': 200,
    'wrapAround': true,
    'disableScrolling': true,
    'albumLabel': 'Image %1 of %2'
  });
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(e) {
  const nav = document.getElementById('navbar');
  const menuToggle = document.querySelector('.menu-toggle');
  
  if (window.innerWidth <= 992 && nav.classList.contains('active') && 
      !nav.contains(e.target) && !menuToggle.contains(e.target)) {
    nav.classList.remove('active');
  }
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Add loading animation for images
document.addEventListener('DOMContentLoaded', function() {
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    img.addEventListener('load', function() {
      this.style.opacity = '1';
    });
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.3s ease-in-out';
  });
});