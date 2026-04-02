/* ============================================================
   ATHENIO — FEATURES.JS
   Exit-intent popup, social proof toasts, desktop sticky CTA,
   scroll-depth tracking, form interaction tracking.
   ============================================================ */

// ----------------------------------------------------------
// 1. EXIT INTENT POPUP (desktop only, min-width 769px)
// ----------------------------------------------------------
(function () {
  'use strict';

  var mql = window.matchMedia('(min-width: 769px)');
  if (!mql.matches) return;

  var popup = document.getElementById('exitPopup');
  var closeBtn = document.getElementById('exitPopupClose');
  if (!popup) return;

  var SESSION_KEY = 'athenio_exit_shown';
  var pageLoadTime = Date.now();

  function showPopup() {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    if (Date.now() - pageLoadTime < 5000) return;

    popup.classList.add('active');
    sessionStorage.setItem(SESSION_KEY, '1');
  }

  function hidePopup() {
    popup.classList.remove('active');
  }

  document.addEventListener('mouseout', function (e) {
    if (e.clientY < 0) {
      showPopup();
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', hidePopup);
  }

  // CTA inside popup also closes it
  var ctaBtn = document.getElementById('exitPopupCta');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', hidePopup);
  }

  popup.addEventListener('click', function (e) {
    if (e.target === popup) {
      hidePopup();
    }
  });
})();


// ----------------------------------------------------------
// 2. SOCIAL PROOF TOASTS
// ----------------------------------------------------------
(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  var toast = document.getElementById('socialToast');
  if (!toast) return;

  var nameEl     = document.getElementById('socialToastName');
  var cityEl     = document.getElementById('socialToastCity');
  var timeEl     = document.getElementById('socialToastTime');
  var initialsEl = document.getElementById('socialToastInitials');
  var closeBtn   = document.getElementById('socialToastClose');

  var entries = [
    { name: 'Carlos',   city: 'São Paulo',       time: '2 min' },
    { name: 'Ana',      city: 'Belo Horizonte',  time: '5 min' },
    { name: 'Ricardo',  city: 'Curitiba',         time: '8 min' },
    { name: 'Fernanda', city: 'Florianópolis',    time: '3 min' },
    { name: 'Pedro',    city: 'Porto Alegre',     time: '12 min' },
    { name: 'Juliana',  city: 'Recife',           time: '1 min' },
    { name: 'Marcos',   city: 'Brasília',         time: '6 min' },
    { name: 'Camila',   city: 'Salvador',         time: '4 min' }
  ];

  var shuffled = [];
  var index = 0;
  var hideTimer = null;

  function shuffle(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function getInitials(name) {
    return name
      .split(/\s+/)
      .map(function (w) { return w.charAt(0).toUpperCase(); })
      .join('');
  }

  function showToast() {
    var exitPopup = document.getElementById('exitPopup');
    if (exitPopup && exitPopup.classList.contains('active')) {
      scheduleNext();
      return;
    }

    if (index >= shuffled.length) {
      shuffled = shuffle(entries);
      index = 0;
    }

    var entry = shuffled[index++];

    if (nameEl)     nameEl.textContent     = entry.name;
    if (cityEl)     cityEl.textContent     = entry.city;
    if (timeEl)     timeEl.textContent     = entry.time;
    if (initialsEl) initialsEl.textContent = getInitials(entry.name);

    toast.classList.add('show');

    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      toast.classList.remove('show');
      scheduleNext();
    }, 5000);
  }

  function scheduleNext() {
    var delay = Math.floor(Math.random() * 10000) + 15000; // 15-25 seconds
    setTimeout(showToast, delay);
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      toast.classList.remove('show');
      clearTimeout(hideTimer);
      scheduleNext();
    });
  }

  // Start after 8 seconds
  setTimeout(function () {
    shuffled = shuffle(entries);
    showToast();
  }, 8000);
})();


// ----------------------------------------------------------
// 3. DESKTOP STICKY CTA (min-width 769px)
// ----------------------------------------------------------
(function () {
  'use strict';

  var mql = window.matchMedia('(min-width: 769px)');
  if (!mql.matches) return;

  var stickyCta = document.getElementById('desktopStickyCta');
  var hero      = document.getElementById('hero');
  if (!stickyCta || !hero) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      // When hero is NOT intersecting (scrolled past), show the sticky CTA
      stickyCta.classList.toggle('visible', !entry.isIntersecting);
    });
  }, { threshold: 0 });

  observer.observe(hero);
})();


// ----------------------------------------------------------
// 4. LGPD BADGE — No JS needed (pure HTML/CSS)
// ----------------------------------------------------------


// ----------------------------------------------------------
// 5. SCROLL DEPTH TRACKING
// ----------------------------------------------------------
(function () {
  'use strict';

  var milestones = [25, 50, 75, 100];
  var fired = {};

  function getScrollPercent() {
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return 100;
    return Math.round((window.scrollY / docHeight) * 100);
  }

  function checkMilestones() {
    var percent = getScrollPercent();
    milestones.forEach(function (m) {
      if (!fired[m] && percent >= m) {
        fired[m] = true;
        console.log('[Analytics] Scroll depth:', m + '%');
        if (window.dataLayer) {
          window.dataLayer.push({ event: 'scroll_depth', depth: m });
        }
      }
    });
  }

  window.addEventListener('scroll', checkMilestones, { passive: true });
  // Check once on load in case page is already scrolled
  checkMilestones();
})();


// ----------------------------------------------------------
// 6. FORM INTERACTION TRACKING
// ----------------------------------------------------------
(function () {
  'use strict';

  var form = document.getElementById('waitlistForm');
  if (!form) return;

  var firstFocusTime = null;

  // Track focus on each form field
  var fields = form.querySelectorAll('input, select, textarea');
  fields.forEach(function (field) {
    // Skip hidden fields and honeypot
    if (field.type === 'hidden' || field.name === '_hp') return;

    field.addEventListener('focus', function () {
      var fieldName = field.name || field.id || 'unknown';
      console.log('[Analytics] Field focus:', fieldName);

      if (window.dataLayer) {
        window.dataLayer.push({ event: 'form_field_focus', field: fieldName });
      }

      if (!firstFocusTime) {
        firstFocusTime = Date.now();
      }
    });
  });

  // Track form submit attempts
  form.addEventListener('submit', function () {
    var isValid = form.checkValidity();

    var timeSpent = null;
    if (firstFocusTime) {
      timeSpent = Math.round((Date.now() - firstFocusTime) / 1000);
    }

    console.log('[Analytics] Form submit attempt', { valid: isValid });

    if (window.dataLayer) {
      var payload = {
        event: 'form_submit_attempt',
        valid: isValid
      };
      if (timeSpent !== null) {
        payload.time_on_form_seconds = timeSpent;
      }
      window.dataLayer.push(payload);
    }
  });
})();
