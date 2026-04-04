/* ============================================================
   ATHENIO — FEATURES.JS
   Exit-intent popup, desktop sticky CTA,
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
