// Ad Blocker — element hiding
(function () {
  "use strict";

  // Common ad-serving hosts found in iframe/frame `src`.
  const AD_SRC_HOSTS = [
    "doubleclick.net", "googlesyndication.com", "googletagmanager.com",
    "amazon-adsystem.com", "adnxs.com", "adsrvr.org", "taboola.com",
    "outbrain.com", "criteo.com", "casalemedia.com", "openx.net",
    "pubmatic.com", "moatads.com", "adroll.com", "yieldmanager.com",
    "rubiconproject.com", "media.net", "revcontent.com", "mgid.com"
  ];

  // Explicit selectors for known ad containers/placeholders.
  const SELECTORS = [
    // Google AdSense / DFP slots
    "[id^='google_ads']",
    "[id^='div-gpt-ad']",
    "[id*='google_ads_iframe']",
    "ins.adsbygoogle",
    "ins.adsense",
    // Common ad wrappers
    ".ad-banner", ".ad-container", ".ad-container-*", ".ad-wrapper", ".ad-slot",
    ".adbox", "#adbox", ".sponsored-content", ".sponsored", ".sponsor",
    "[class^='advert']", "[id^='advert']", ".banner-ad", ".ad-banner",
    // YouTube / video pre-roll placeholders
    ".ytp-ad-module", ".ytp-ad-overlay-container", ".ytp-ad-player-overlay",
    ".video-ads", ".ytd-promoted-video-renderer",
    // Generic sponsor/promo sections
    "[data-advertisement]", "[data-ad]", "[class*='js-ad']"
  ];

  // Word-boundary-ish regex for class/id tokens that look like ads.
  const AD_TOKEN = /(^|[-_ ])(ad|ads|advert|advertisement|sponsor|promo|banner)([-_0-9]|$)/i;

  function looksLikeAdToken(value) {
    if (!value) return false;
    return AD_TOKEN.test(value);
  }

  function isAdFrame(el) {
    if (!(el instanceof HTMLIFrameElement) && !(el instanceof HTMLFrameElement)) return false;
    try {
      const src = el.src || "";
      return AD_SRC_HOSTS.some((h) => src.indexOf(h) !== -1);
    } catch (e) {
      return false;
    }
  }

  function shouldHide(el) {
    if (el._adblockMarked) return true;
    if (isAdFrame(el)) return true;

    const tag = el.tagName ? el.tagName.toLowerCase() : "";
    // Don't hide the whole document or body.
    if (tag === "html" || tag === "body" || tag === "head") return false;

    for (const sel of SELECTORS) {
      try {
        if (el.matches && el.matches(sel)) return true;
      } catch (e) {
        /* invalid selector, ignore */
      }
    }

    const id = el.id || "";
    const cls = typeof el.className === "string" ? el.className : "";
    if (looksLikeAdToken(id)) return true;
    if (looksLikeAdToken(cls)) return true;

    const label = el.getAttribute ? el.getAttribute("aria-label") : "";
    if (label && /^(ad|advertisement|sponsored)/i.test(label)) return true;

    return false;
  }

  function hide(el) {
    if (!el || el._adblockMarked) return;
    try {
      el._adblockMarked = true;
      el.setAttribute("data-adblocked", "true");
      el.style.setProperty("display", "none", "important");
      el.style.setProperty("visibility", "hidden", "important");
      el.style.setProperty("height", "0", "important");
    } catch (e) {
      /* ignore */
    }
  }

  function scan(root) {
    if (root && root.nodeType === Node.ELEMENT_NODE && shouldHide(root)) {
      hide(root);
      return; // no need to descend into hidden subtree
    }
    const list = [];
    if (root && root.querySelectorAll) {
      // Query known selectors first (cheap), then walk for token matches.
      for (const sel of SELECTORS) {
        try {
          list.push(...root.querySelectorAll(sel));
        } catch (e) {
          /* ignore */
        }
      }
    }
    for (const el of list) hide(el);

    // Generic walk for token heuristics (throttled).
    if (root && root.querySelectorAll) {
      const all = root.querySelectorAll("*");
      for (let i = 0; i < all.length; i++) {
        const el = all[i];
        if (el._adblockMarked) continue;
        if (isAdFrame(el) || looksLikeAdToken(el.id) || looksLikeAdToken((typeof el.className === "string" ? el.className : ""))) {
          hide(el);
        }
      }
    }
  }

  function runScan(mutations) {
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (n && n.nodeType === Node.ELEMENT_NODE) scan(n);
      }
      if (m.type === "attributes") scan(m.target);
    }
  }

  const observer = new MutationObserver(runScan);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "id", "aria-label"]
  });

  // Initial scan once the DOM is ready.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => scan(document.body));
  } else {
    scan(document.body);
  }
})();
