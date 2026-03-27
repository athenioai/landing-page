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

// ----------------------------------------------------------
// 7. WHATSAPP FAB — número e link dinâmico
// ----------------------------------------------------------
const WA_NUMBER = '5511999999999'; // ← Substitua pelo número real (DDI+DDD+número)

const waBtn = document.getElementById('whatsappBtn');
if (waBtn) waBtn.href = `https://wa.me/${WA_NUMBER}`;

// ----------------------------------------------------------
// 8. LEAD FORM — validação, sanitização, honeypot, rate limit
// ----------------------------------------------------------
const leadForm    = document.getElementById('leadForm');
const leadSuccess = document.getElementById('leadSuccess');

if (leadForm && leadSuccess) {

  // Remove caracteres que podem causar injeção
  function sanitize(str) {
    return String(str).replace(/[<>"'`\\]/g, '').trim().slice(0, 200);
  }

  // Regras de validação por campo
  const RULES = {
    nome:     (v) => !v ? 'Preencha seu nome completo.'
                       : v.length < 2 ? 'Nome muito curto.' : null,
    empresa:  (v) => !v ? 'Preencha o nome da empresa.'
                       : v.length < 2 ? 'Nome muito curto.' : null,
    email:    (v) => !v ? 'Preencha seu e-mail.'
                       : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'E-mail inválido.' : null,
    whatsapp: (v) => {
      if (!v) return 'Preencha seu WhatsApp.';
      const d = v.replace(/\D/g, '');
      return (d.length < 10 || d.length > 13) ? 'Número inválido. Ex: (11) 99999-9999' : null;
    },
  };

  function validateField(name) {
    const input = leadForm.querySelector(`[name="${name}"]`);
    const errEl = document.getElementById(`err-${name}`);
    if (!input || !errEl) return true;
    const error = RULES[name](sanitize(input.value));
    if (error) {
      input.classList.add('invalid');
      input.classList.remove('valid');
      errEl.textContent = error;
      return false;
    }
    input.classList.remove('invalid');
    input.classList.add('valid');
    errEl.textContent = '';
    return true;
  }

  // Máscara do WhatsApp: (xx) xxxxx-xxxx
  const waInput = document.getElementById('f-whatsapp');
  if (waInput) {
    waInput.addEventListener('input', (e) => {
      let d = e.target.value.replace(/\D/g, '').slice(0, 11);
      if (d.length > 10) {
        d = `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
      } else if (d.length > 6) {
        d = `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
      } else if (d.length > 2) {
        d = `(${d.slice(0,2)}) ${d.slice(2)}`;
      } else if (d.length > 0) {
        d = `(${d}`;
      }
      e.target.value = d;
    });
  }

  // Valida ao sair do campo e limpa erro ao corrigir
  Object.keys(RULES).forEach((name) => {
    const input = leadForm.querySelector(`[name="${name}"]`);
    if (!input) return;
    input.addEventListener('blur',  () => validateField(name));
    input.addEventListener('input', () => { if (input.classList.contains('invalid')) validateField(name); });
  });

  // Rate limit: bloqueia reenvio em menos de 10s
  let lastSubmit = 0;

  leadForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Honeypot: bot preencheu o campo oculto → ignora silenciosamente
    if ((leadForm.querySelector('[name="_hp"]')?.value || '').trim()) return;

    // Rate limit
    if (Date.now() - lastSubmit < 10000) return;

    // Valida todos os campos
    const allValid = Object.keys(RULES).map(validateField).every(Boolean);
    if (!allValid) {
      leadForm.classList.add('shake');
      leadForm.addEventListener('animationend', () => leadForm.classList.remove('shake'), { once: true });
      leadForm.querySelector('.invalid')?.focus();
      return;
    }

    lastSubmit = Date.now();

    const data    = new FormData(leadForm);
    const nome    = sanitize(data.get('nome')    || '');
    const empresa = sanitize(data.get('empresa') || '');
    const msg     = encodeURIComponent(
      `Olá! Me chamo ${nome}, da empresa ${empresa}.\n\nGostaria de agendar meu Diagnóstico Gratuito com a Athenio.`
    );

    // Loading state
    const submitBtn = document.getElementById('leadSubmit');
    submitBtn.classList.add('loading');

    setTimeout(() => {
      leadForm.hidden           = true;
      leadSuccess.hidden        = false;
      leadSuccess.style.display = 'flex';
    }, 1800);
  });
}

// ----------------------------------------------------------
// 9. COUNTDOWN — vagas de abril (deadline: 30/04/2026)
// ----------------------------------------------------------
const DEADLINE = new Date('2026-04-30T23:59:59-03:00');

function updateCountdown() {
  const diff = DEADLINE - Date.now();
  if (diff <= 0) return;

  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000)  / 60000);
  const pad   = (n) => String(n).padStart(2, '0');

  const cdDays  = document.getElementById('cdDays');
  const cdHours = document.getElementById('cdHours');
  const cdMins  = document.getElementById('cdMins');
  if (cdDays)  cdDays.textContent  = days;
  if (cdHours) cdHours.textContent = pad(hours);
  if (cdMins)  cdMins.textContent  = pad(mins);

  const stickyCD = document.getElementById('stickyCountdown');
  if (stickyCD) stickyCD.textContent = `${days}d ${pad(hours)}h`;
}

updateCountdown();
setInterval(updateCountdown, 30000);

// ----------------------------------------------------------
// 10. SPOTS PROGRESS BAR — anima ao entrar na viewport
// ----------------------------------------------------------
const spotsBarFill = document.querySelector('.spots-bar-fill');
if (spotsBarFill) {
  const spotsObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          spotsBarFill.classList.add('animate');
          spotsObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  spotsObserver.observe(spotsBarFill.closest('.spots-progress'));
}
