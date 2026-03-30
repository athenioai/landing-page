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
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  if (prefersReducedMotion) {
    el.classList.add('visible');
  } else {
    animateObserver.observe(el);
  }
});

// ----------------------------------------------------------
// 3. COUNTER ANIMATION — Stats section
// ----------------------------------------------------------
function runCounter(el) {
  const target = parseInt(el.dataset.count, 10);
  if (prefersReducedMotion) {
    el.textContent = String(target);
    return;
  }
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
// 4. MOBILE MENU — toggle (só na home / páginas com menu completo)
// ----------------------------------------------------------
const menuToggle = document.getElementById('menuToggle');
const navLinks   = document.getElementById('navLinks');

if (menuToggle && navLinks && navbar) {
  function openMenu() {
    navbar.classList.add('menu-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Fechar menu');
    document.body.style.overflow = 'hidden';

    const [s1, , s3] = menuToggle.querySelectorAll('span');
    menuToggle.querySelectorAll('span')[1].style.opacity = '0';
    s1.style.transform = 'translateY(6.5px) rotate(45deg)';
    s3.style.transform = 'translateY(-6.5px) rotate(-45deg)';
  }

  function closeMenu() {
    navbar.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Abrir menu');
    document.body.style.overflow = '';

    menuToggle.querySelectorAll('span').forEach((s) => {
      s.style.transform = '';
      s.style.opacity   = '';
    });
  }

  menuToggle.addEventListener('click', () => {
    navbar.classList.contains('menu-open') ? closeMenu() : openMenu();
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navbar.classList.contains('menu-open')) closeMenu();
  });
}

// ----------------------------------------------------------
// 5. ACTIVE NAV LINK — highlight on scroll
// ----------------------------------------------------------
const sections = document.querySelectorAll('section[id], footer[id]');
const navItems = document.querySelectorAll('.nav-links a[href^="#"]');

if (navItems.length) {
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
}

// ----------------------------------------------------------
// 6. STICKY BAR — show after hero, dismiss on close
// ----------------------------------------------------------
const stickyBar   = document.getElementById('stickyBar');
const stickyClose = document.getElementById('stickyBarClose');
const heroSection = document.getElementById('hero');

if (stickyBar && stickyClose && heroSection) {
  let dismissed = false;

  const stickyFocusables = () => stickyBar.querySelectorAll('a[href], button');

  function syncStickyA11y(isVisible) {
    stickyBar.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    stickyFocusables().forEach((el) => {
      if (isVisible) el.removeAttribute('tabindex');
      else el.setAttribute('tabindex', '-1');
    });
  }

  syncStickyA11y(false);

  function updateStickyFromScroll() {
    if (dismissed) return;
    const show = heroSection.getBoundingClientRect().bottom < 0;
    stickyBar.classList.toggle('visible', show);
    syncStickyA11y(show);
  }

  window.addEventListener('scroll', updateStickyFromScroll, { passive: true });
  updateStickyFromScroll();

  stickyClose.addEventListener('click', () => {
    dismissed = true;
    stickyBar.classList.remove('visible');
    syncStickyA11y(false);
  });
}

// ----------------------------------------------------------
// 7. WHATSAPP FAB — número e link dinâmico
// ----------------------------------------------------------
/** Mesmo número em index.html no href do #whatsappBtn (fallback antes do JS). */
const WA_NUMBER = '5511999999999'; // ← Substitua pelo WhatsApp real (DDI + DDD + número, só dígitos)

const waBtn = document.getElementById('whatsappBtn');
if (waBtn) waBtn.href = `https://wa.me/${WA_NUMBER}`;

// ----------------------------------------------------------
// 8. LEAD FORM — validação, sanitização, honeypot, rate limit, UTMs, obrigado
// ----------------------------------------------------------
const ATTR_KEYS     = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];
const ATTR_STORAGE  = 'athenio_attr_v1';
const THANK_YOU_PAGE = 'obrigado.html';

function mergeAttributionFromUrl() {
  const params = new URLSearchParams(window.location.search);
  let pack = {};
  try {
    pack = JSON.parse(sessionStorage.getItem(ATTR_STORAGE) || '{}');
  } catch (_) {
    pack = {};
  }
  let changed = false;
  ATTR_KEYS.forEach((k) => {
    const v = params.get(k);
    if (v != null && String(v).trim() !== '') {
      pack[k] = String(v).trim().slice(0, 240);
      changed = true;
    }
  });
  if (changed) sessionStorage.setItem(ATTR_STORAGE, JSON.stringify(pack));
}

function applyAttributionToLeadForm(form) {
  if (!form) return;
  let pack = {};
  try {
    pack = JSON.parse(sessionStorage.getItem(ATTR_STORAGE) || '{}');
  } catch (_) {
    pack = {};
  }
  const params = new URLSearchParams(window.location.search);
  ATTR_KEYS.forEach((k) => {
    const input = form.querySelector(`[name="${k}"]`);
    if (!input) return;
    const fromUrl = params.get(k);
    if (fromUrl != null && String(fromUrl).trim() !== '') {
      input.value = String(fromUrl).trim().slice(0, 240);
    } else if (pack[k]) {
      input.value = String(pack[k]).slice(0, 240);
    }
  });
}

mergeAttributionFromUrl();

function applySatelliteDefaults(form) {
  if (!form) return;
  const b = document.body;
  const camp = b.getAttribute('data-default-utm-campaign');
  if (!camp) return;
  const pairs = [
    ['utm_campaign', camp],
    ['utm_source', b.getAttribute('data-default-utm-source') || 'satellite'],
    ['utm_medium', b.getAttribute('data-default-utm-medium') || 'landing_satelite'],
  ];
  pairs.forEach(([name, val]) => {
    if (!val) return;
    const el = form.querySelector(`[name="${name}"]`);
    if (el && !String(el.value || '').trim()) el.value = String(val).slice(0, 240);
  });
}

const leadForm = document.getElementById('leadForm');

if (leadForm) {
  applyAttributionToLeadForm(leadForm);
  applySatelliteDefaults(leadForm);
  const preDor = document.body.getAttribute('data-prefill-dor');
  if (preDor) {
    const sel = leadForm.querySelector('[name="dor_principal"]');
    if (sel && !String(sel.value || '').trim()) sel.value = preDor;
  }

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
      input.setAttribute('aria-invalid', 'true');
      errEl.textContent = error;
      return false;
    }
    input.classList.remove('invalid');
    input.classList.add('valid');
    input.setAttribute('aria-invalid', 'false');
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

  function validateConsent() {
    const checkbox = document.getElementById('f-consent');
    const errEl    = document.getElementById('err-consent');
    if (!checkbox?.checked) {
      checkbox?.setAttribute('aria-invalid', 'true');
      errEl.textContent = 'Você precisa aceitar para continuar.';
      return false;
    }
    checkbox.setAttribute('aria-invalid', 'false');
    errEl.textContent = '';
    return true;
  }

  // Valida ao sair do campo e limpa erro ao corrigir
  Object.keys(RULES).forEach((name) => {
    const input = leadForm.querySelector(`[name="${name}"]`);
    if (!input) return;
    input.addEventListener('blur',  () => validateField(name));
    input.addEventListener('input', () => { if (input.classList.contains('invalid')) validateField(name); });
  });

  document.getElementById('f-consent')?.addEventListener('change', validateConsent);

  // Rate limit: bloqueia reenvio em menos de 10s
  let lastSubmit = 0;

  leadForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Honeypot: bot preencheu o campo oculto → ignora silenciosamente
    if ((leadForm.querySelector('[name="_hp"]')?.value || '').trim()) return;

    // Rate limit
    if (Date.now() - lastSubmit < 10000) return;

    // Valida todos os campos + consentimento
    const allValid = Object.keys(RULES).map(validateField).every(Boolean) & validateConsent();
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

    // Loading state → página de obrigado (UTMs na query para analytics / CRM)
    const submitBtn = document.getElementById('leadSubmit');
    submitBtn.classList.add('loading');

    setTimeout(() => {
      const q = new URLSearchParams();
      ATTR_KEYS.forEach((k) => {
        const v = (leadForm.querySelector(`[name="${k}"]`)?.value || '').trim();
        if (v) q.set(k, v);
      });
      const dor = (leadForm.querySelector('[name="dor_principal"]')?.value || '').trim();
      if (dor) q.set('dor_principal', dor.slice(0, 80));
      const qs = q.toString();
      window.location.href = THANK_YOU_PAGE + (qs ? `?${qs}` : '');
    }, 900);
  });
}

// ----------------------------------------------------------
// 9. ESCASSEZ — ciclo mensal em America/Sao_Paulo (calendário + countdown)
//    Vagas preenchidas sobem ao longo do mês (dia 1 → menos ocupadas; último dia → mais ocupadas).
//    Fim do ciclo: último dia do mês, 23:59:59.999 em -03:00 (SP sem DST desde 2019).
// ----------------------------------------------------------
const SCARCITY_TOTAL_SLOTS = 10;
const SCARCITY_MIN_FILLED  = 2;
const SCARCITY_MAX_FILLED  = 9;
const SCARCITY_TZ          = 'America/Sao_Paulo';
/** Offset fixo para o deadline textual (compatível com o horário legal atual de SP). */
const SCARCITY_UTC_OFFSET  = '-03:00';

function scarcityCapitalizeMonth(str) {
  if (!str) return str;
  return str.charAt(0).toLocaleUpperCase('pt-BR') + str.slice(1);
}

/**
 * Ano / mês (1–12) / dia no calendário de São Paulo para o instante `date`.
 * @param {Date} date
 * @returns {{ year: number, month: number, day: number }}
 */
function getSaoPauloYMD(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SCARCITY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const v = (type) => parseInt(parts.find((p) => p.type === type).value, 10);
  return { year: v('year'), month: v('month'), day: v('day') };
}

/** Quantidade de dias no mês civil `month` (1–12) em `year`. */
function scarcityDaysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Instante UTC do último milissegundo do último dia do mês civil em SP (via string com offset -03:00).
 * @param {number} year
 * @param {number} month 1–12
 */
function scarcityEndOfMonthDeadline(year, month) {
  const lastDay = scarcityDaysInMonth(year, month);
  const pad = (n) => String(n).padStart(2, '0');
  const iso = `${year}-${pad(month)}-${pad(lastDay)}T23:59:59.999${SCARCITY_UTC_OFFSET}`;
  return new Date(iso);
}

/**
 * @returns {{ monthLabel: string, filled: number, remaining: number, pctFilled: number, deadline: Date, total: number }}
 */
function getScarcityState() {
  const now = new Date();
  const { year: y, month: m, day } = getSaoPauloYMD(now);
  const daysInMonth = scarcityDaysInMonth(y, m);

  const monthRaw = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    timeZone: SCARCITY_TZ,
  }).format(now);
  const monthLabel = scarcityCapitalizeMonth(monthRaw);

  const progress = daysInMonth <= 1 ? 1 : (day - 1) / (daysInMonth - 1);
  const filled = Math.round(
    SCARCITY_MIN_FILLED + progress * (SCARCITY_MAX_FILLED - SCARCITY_MIN_FILLED)
  );
  const remaining = SCARCITY_TOTAL_SLOTS - filled;
  const pctFilled = Math.round((filled / SCARCITY_TOTAL_SLOTS) * 100);
  const deadline  = scarcityEndOfMonthDeadline(y, m);

  return {
    monthLabel,
    filled,
    remaining,
    pctFilled,
    deadline,
    total: SCARCITY_TOTAL_SLOTS,
  };
}

function applyScarcityUI(s) {
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setText('scarcity-month-pioneers', s.monthLabel);
  setText('scarcity-remaining-pioneers', String(s.remaining));
  setText('scarcity-remaining-cta', String(s.remaining));
  setText('scarcity-month-cta', s.monthLabel);
  setText('scarcity-remaining-sticky', String(s.remaining));
  setText('scarcity-month-sticky', s.monthLabel);

  const spotsLabel = document.getElementById('spots-label');
  if (spotsLabel) {
    spotsLabel.innerHTML = `${s.filled} de ${s.total} vagas preenchidas · <strong>${s.remaining} restantes</strong>`;
  }

  const track = document.getElementById('spots-bar-track');
  if (track) {
    track.setAttribute('aria-valuenow', String(s.pctFilled));
    track.setAttribute(
      'aria-valuetext',
      `${s.filled} de ${s.total} vagas preenchidas, ${s.remaining} restantes no ciclo de ${s.monthLabel}`
    );
    track.setAttribute(
      'aria-label',
      `${s.pctFilled}% das vagas do ciclo de ${s.monthLabel} já preenchidas`
    );
  }

  const spotsProgress = document.getElementById('spots-progress');
  if (spotsProgress) {
    spotsProgress.style.setProperty('--spots-fill-pct', `${s.pctFilled}%`);
  }
}

function updateCountdownAndScarcity() {
  const s    = getScarcityState();
  const diff = s.deadline.getTime() - Date.now();

  applyScarcityUI(s);

  const days  = Math.max(0, Math.floor(diff / 86400000));
  const hours = Math.max(0, Math.floor((diff % 86400000) / 3600000));
  const mins  = Math.max(0, Math.floor((diff % 3600000) / 60000));
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

updateCountdownAndScarcity();
setInterval(updateCountdownAndScarcity, 30000);

// ----------------------------------------------------------
// 10. SPOTS PROGRESS BAR — anima ao entrar na viewport
// ----------------------------------------------------------
const spotsBarFill = document.getElementById('spots-bar-fill');
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
  const spotsProgress = document.getElementById('spots-progress');
  if (spotsProgress) spotsObserver.observe(spotsProgress);
}
