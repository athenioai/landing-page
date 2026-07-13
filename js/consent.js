/**
 * Cookie consent banner (LGPD). Non-essential cookies (Google Analytics)
 * stay disabled via Google Consent Mode until the visitor accepts.
 * Choice is stored in localStorage and can be reset by clearing site data.
 */
(function () {
  var STORAGE_KEY = "athenio_consent_v1";

  function applyConsent(state) {
    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", {
        analytics_storage: state,
        ad_storage: state,
        ad_user_data: state,
        ad_personalization: state,
      });
    }
  }

  var saved = null;
  try {
    saved = window.localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    /* storage blocked: treat as no consent, show banner */
  }

  if (saved === "granted") {
    applyConsent("granted");
    return;
  }
  if (saved === "denied") return;

  var style = document.createElement("style");
  style.textContent = [
    "#cookieBanner{position:fixed;left:16px;right:16px;bottom:16px;z-index:1000;",
    "max-width:560px;margin:0 auto;padding:20px 22px;border-radius:14px;",
    "background:rgba(12,24,24,0.97);border:1px solid rgba(155,180,180,0.2);",
    "box-shadow:0 24px 60px -20px rgba(0,0,0,0.8);backdrop-filter:blur(12px);",
    "font-family:'Sora',system-ui,sans-serif;color:#edf2f2;",
    "opacity:0;transform:translateY(12px);transition:opacity .4s,transform .4s}",
    "#cookieBanner.show{opacity:1;transform:none}",
    "#cookieBanner p{margin:0;font-size:.86rem;font-weight:300;line-height:1.6;color:#9bb4b4}",
    "#cookieBanner a{color:#edf2f2;text-decoration:underline;text-underline-offset:3px}",
    "#cookieBanner a:hover{color:#4fd1c5}",
    "#cookieBanner .cb-actions{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}",
    "#cookieBanner button{cursor:pointer;font-family:inherit;font-size:.88rem;",
    "padding:.6em 1.3em;border-radius:9px;transition:all .25s}",
    "#cookieBanner .cb-accept{background:#4fd1c5;border:1px solid transparent;color:#06201d;font-weight:600}",
    "#cookieBanner .cb-accept:hover{background:#6ee0d6}",
    "#cookieBanner .cb-reject{background:none;border:1px solid rgba(155,180,180,0.25);color:#edf2f2;font-weight:400}",
    "#cookieBanner .cb-reject:hover{border-color:rgba(79,209,197,0.5);color:#4fd1c5}",
  ].join("");
  document.head.appendChild(style);

  var banner = document.createElement("div");
  banner.id = "cookieBanner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-label", "Consentimento de cookies");
  banner.innerHTML =
    "<p>Usamos cookies para entender como o site é utilizado e melhorar a experiência. " +
    "Cookies não essenciais só são ativados com o seu consentimento. " +
    'Saiba mais na <a href="cookies.html">Política de Cookies</a>.</p>' +
    '<div class="cb-actions">' +
    '<button type="button" class="cb-accept">Aceitar</button>' +
    '<button type="button" class="cb-reject">Recusar</button>' +
    "</div>";

  function close(choice) {
    try {
      window.localStorage.setItem(STORAGE_KEY, choice);
    } catch (err) {
      /* storage blocked: choice lasts for this page only */
    }
    if (choice === "granted") applyConsent("granted");
    banner.remove();
  }

  banner.querySelector(".cb-accept").addEventListener("click", function () {
    close("granted");
  });
  banner.querySelector(".cb-reject").addEventListener("click", function () {
    close("denied");
  });

  function mount() {
    document.body.appendChild(banner);
    /* force a layout pass so the entry transition always runs (rAF can be throttled) */
    void banner.offsetHeight;
    banner.classList.add("show");
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
