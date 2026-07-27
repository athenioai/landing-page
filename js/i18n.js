/**
 * Generic, dependency-free i18n runtime for the Athenio static site.
 *
 * The HTML markup is authored in the source language (pt). Dictionaries live in
 * js/i18n/<lang>.js and register themselves through I18N.register(), so a
 * visitor only downloads the dictionary of the language actually displayed.
 *
 * Markup contract:
 *   data-i18n="key"                      -> textContent
 *   data-i18n-html="key"                 -> innerHTML (copy with inline tags)
 *   data-i18n-attr="placeholder:key,..." -> one or more attributes
 *   data-i18n-words="key"                -> word-by-word spans (hero headline)
 *   data-i18n-switcher                   -> language switcher mount point
 */
(function () {
  var SUPPORTED = ["pt", "en", "es"];
  var SOURCE_LANG = "pt";
  var HTML_LANG = { pt: "pt-BR", en: "en", es: "es" };
  var STORAGE_KEY = "athenio_lang";
  var BASE = document.currentScript
    ? document.currentScript.src.replace(/i18n\.js.*$/, "i18n/")
    : "js/i18n/";

  var dictionaries = {};
  var loaded = {};
  var pending = {};
  var current = SOURCE_LANG;

  /* Extra dictionary files this page needs, e.g. data-i18n-bundles="legal". */
  var BUNDLES = [""].concat(
    (document.documentElement.getAttribute("data-i18n-bundles") || "")
      .split(",")
      .map(function (name) {
        return name.trim();
      })
      .filter(Boolean),
  );

  function readStored() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return null;
    }
  }

  function writeStored(lang) {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch (err) {
      /* storage blocked: the choice lasts for this page view only */
    }
  }

  function detect() {
    var stored = readStored();
    if (SUPPORTED.indexOf(stored) !== -1) return stored;
    var tags = navigator.languages || [navigator.language || SOURCE_LANG];
    for (var i = 0; i < tags.length; i++) {
      var base = String(tags[i]).toLowerCase().split("-")[0];
      if (SUPPORTED.indexOf(base) !== -1) return base;
    }
    return "en";
  }

  function translate(key) {
    var dict = dictionaries[current];
    if (!dict) return null;
    var value = dict[key];
    return typeof value === "string" ? value : null;
  }

  function setText(el, key) {
    var value = translate(key);
    if (value !== null) el.textContent = value;
  }

  function setHtml(el, key) {
    var value = translate(key);
    if (value !== null) el.innerHTML = value;
  }

  function setAttrs(el) {
    el.getAttribute("data-i18n-attr")
      .split(",")
      .forEach(function (pair) {
        var parts = pair.split(":");
        if (parts.length !== 2) return;
        var value = translate(parts[1].trim());
        if (value !== null) el.setAttribute(parts[0].trim(), value);
      });
  }

  /** Rebuilds a headline as animated word spans. "*word*" marks the accent. */
  function setWords(el, key) {
    var value = translate(key);
    if (value === null) return;
    var plain = value.replace(/\*/g, "");
    el.setAttribute("aria-label", plain);
    el.innerHTML = plain
      .split(/\s+/)
      .map(function (word, index) {
        var accent = value.indexOf("*" + word + "*") !== -1;
        return (
          '<span class="w' +
          (accent ? " hl" : "") +
          '" style="--i: ' +
          index +
          '" aria-hidden="true">' +
          word +
          "</span>"
        );
      })
      .join(" ");
  }

  function apply() {
    document.documentElement.lang = HTML_LANG[current] || current;
    var q = document.querySelectorAll.bind(document);
    q("[data-i18n]").forEach(function (el) {
      setText(el, el.getAttribute("data-i18n"));
    });
    q("[data-i18n-html]").forEach(function (el) {
      setHtml(el, el.getAttribute("data-i18n-html"));
    });
    q("[data-i18n-attr]").forEach(setAttrs);
    q("[data-i18n-words]").forEach(function (el) {
      setWords(el, el.getAttribute("data-i18n-words"));
    });
    q("[data-i18n-switcher]").forEach(renderSwitcher);
    document.dispatchEvent(
      new CustomEvent("i18n:applied", { detail: { lang: current } }),
    );
  }

  function loadFile(name, done) {
    if (loaded[name]) return done();
    if (pending[name]) return pending[name].push(done);
    pending[name] = [done];
    var script = document.createElement("script");
    script.src = BASE + name + ".js";
    script.onload = script.onerror = function () {
      loaded[name] = true;
      var queue = pending[name];
      delete pending[name];
      queue.forEach(function (cb) {
        cb();
      });
    };
    document.head.appendChild(script);
  }

  /** Loads the base dictionary plus every bundle this page declared. */
  function load(lang, done) {
    var remaining = BUNDLES.length;
    BUNDLES.forEach(function (bundle) {
      loadFile(lang + (bundle ? "." + bundle : ""), function () {
        if (--remaining === 0) done();
      });
    });
  }

  function setLanguage(lang) {
    if (SUPPORTED.indexOf(lang) === -1 || lang === current) return;
    writeStored(lang);
    load(lang, function () {
      current = lang;
      apply();
    });
  }

  function renderSwitcher(mount) {
    if (mount.dataset.i18nReady) {
      mount.querySelectorAll("button").forEach(function (btn) {
        var active = btn.getAttribute("data-lang") === current;
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-pressed", String(active));
      });
      return;
    }
    mount.className = (mount.className + " lang-switch").trim();
    mount.setAttribute("role", "group");
    mount.setAttribute("aria-label", translate("a11y.langSwitcher") || "Idioma");
    mount.innerHTML = SUPPORTED.map(function (lang) {
      return (
        '<button type="button" data-lang="' +
        lang +
        '" aria-pressed="' +
        (lang === current) +
        '"' +
        (lang === current ? ' class="active"' : "") +
        ">" +
        lang.toUpperCase() +
        "</button>"
      );
    }).join("");
    mount.addEventListener("click", function (event) {
      var btn = event.target.closest("button[data-lang]");
      if (btn) setLanguage(btn.getAttribute("data-lang"));
    });
    mount.dataset.i18nReady = "1";
  }

  function injectStyles() {
    var css = [
      ".lang-switch{display:inline-flex;align-items:center;gap:2px;padding:3px;",
      "border:1px solid rgba(155,180,180,0.18);border-radius:9px;background:rgba(12,24,24,0.5)}",
      ".lang-switch button{font-family:inherit;font-size:0.72rem;font-weight:500;",
      "letter-spacing:0.06em;line-height:1;padding:6px 8px;border:0;border-radius:6px;",
      "background:none;color:#6a8585;cursor:pointer;transition:color .25s,background .25s}",
      ".lang-switch button:hover{color:#edf2f2}",
      ".lang-switch button.active{background:rgba(79,209,197,0.12);color:#4fd1c5}",
      ".translation-notice{margin-top:14px;padding:10px 14px;border-radius:9px;",
      "border:1px solid rgba(155,180,180,0.18);background:rgba(12,24,24,0.6);",
      "font-size:0.82rem;color:#6a8585}",
      ".translation-notice:empty{display:none}",
      "html.i18n-loading body{visibility:hidden}",
    ].join("");
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  function whenReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function boot() {
    injectStyles();
    var target = detect();

    /* The markup is already in the source language: nothing to download. */
    if (target === SOURCE_LANG) return whenReady(apply);

    var root = document.documentElement;
    root.classList.add("i18n-loading");
    window.setTimeout(function () {
      root.classList.remove("i18n-loading");
    }, 1500);

    load(target, function () {
      if (dictionaries[target]) current = target;
      whenReady(function () {
        apply();
        root.classList.remove("i18n-loading");
      });
    });
  }

  window.I18N = {
    supported: SUPPORTED,
    register: function (lang, dict) {
      var target = dictionaries[lang] || (dictionaries[lang] = {});
      Object.keys(dict).forEach(function (key) {
        target[key] = dict[key];
      });
    },
    /** Returns the translated string, or the source-language fallback. */
    t: function (key, fallback) {
      var value = translate(key);
      return value === null ? fallback : value;
    },
    lang: function () {
      return current;
    },
    setLanguage: setLanguage,
    /** Re-scans the document; call it after injecting translatable markup. */
    apply: apply,
  };

  boot();
})();
