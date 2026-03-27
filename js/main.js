/* ============================================================
   ATHENIOS — MAIN.JS
   ============================================================ */

'use strict';

// ----------------------------------------------------------
// 1. NAVBAR — scroll effect
// ----------------------------------------------------------
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 48);
}, { passive: true });

// ----------------------------------------------------------
// 2. SCROLL ANIMATIONS — IntersectionObserver
// ----------------------------------------------------------
const animateObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        animateObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll('[data-animate]').forEach((el) => {
  animateObserver.observe(el);
});

// ----------------------------------------------------------
// 3. COUNTER ANIMATION — Stats section
// ----------------------------------------------------------
function runCounter(el) {
  const target   = parseInt(el.dataset.count, 10);
  const duration = 1800;
  const start    = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

const statsObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('[data-count]').forEach(runCounter);
        statsObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.4 }
);

const statsSection = document.querySelector('.stats');
if (statsSection) statsObserver.observe(statsSection);

// ----------------------------------------------------------
// 4. MOBILE MENU — toggle
// ----------------------------------------------------------
const menuToggle = document.getElementById('menuToggle');
const navLinks   = document.getElementById('navLinks');

function openMenu() {
  navbar.classList.add('menu-open');
  menuToggle.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';

  const [s1, , s3] = menuToggle.querySelectorAll('span');
  menuToggle.querySelectorAll('span')[1].style.opacity = '0';
  s1.style.transform = 'translateY(6.5px) rotate(45deg)';
  s3.style.transform = 'translateY(-6.5px) rotate(-45deg)';
}

function closeMenu() {
  navbar.classList.remove('menu-open');
  menuToggle.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';

  menuToggle.querySelectorAll('span').forEach((s) => {
    s.style.transform = '';
    s.style.opacity   = '';
  });
}

menuToggle.addEventListener('click', () => {
  navbar.classList.contains('menu-open') ? closeMenu() : openMenu();
});

// Close on nav link click
navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', closeMenu);
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && navbar.classList.contains('menu-open')) closeMenu();
});

// ----------------------------------------------------------
// 5. ACTIVE NAV LINK — highlight on scroll
// ----------------------------------------------------------
const sections  = document.querySelectorAll('section[id], footer[id]');
const navItems  = document.querySelectorAll('.nav-links a[href^="#"]');

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navItems.forEach((link) => {
          const active = link.getAttribute('href') === `#${id}`;
          link.style.color = active ? 'var(--text-primary)' : '';
        });
      }
    });
  },
  { threshold: 0.35 }
);

sections.forEach((s) => sectionObserver.observe(s));

// ----------------------------------------------------------
// 6. STICKY BAR — show after hero, dismiss on close
// ----------------------------------------------------------
const stickyBar   = document.getElementById('stickyBar');
const stickyClose = document.getElementById('stickyBarClose');
const heroSection = document.getElementById('hero');

if (stickyBar && stickyClose && heroSection) {
  let dismissed = false;

  window.addEventListener('scroll', () => {
    if (dismissed) return;
    stickyBar.classList.toggle('visible', heroSection.getBoundingClientRect().bottom < 0);
  }, { passive: true });

  stickyClose.addEventListener('click', () => {
    dismissed = true;
    stickyBar.classList.remove('visible');
  });
}
