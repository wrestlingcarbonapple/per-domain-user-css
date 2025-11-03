// content.js
let styleEl = null;
const STYLE_ID = "per-domain-usercss-style";

function ensureStyleEl() {
  if (!styleEl) {
    styleEl = document.getElementById(STYLE_ID);
  }
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    // Use highest precedence by appending as last child of head
    (document.head || document.documentElement).appendChild(styleEl);
  }
  return styleEl;
}

// naive add !important to each declaration; avoids ones that already have it
function addImportant(cssText) {
  // Skip inside @keyframes blocks to avoid breaking animations
  // Split roughly on @keyframes blocks
  const parts = cssText.split(/(@keyframes[\s\S]*?\{[\s\S]*?\}\s*)/gi);
  return parts.map(p => {
    if (/^@keyframes/i.test(p)) return p; // leave untouched
    // Add !important to property declarations ending with ;
    return p.replace(/(:)([^;{}]+)(;)/g, (m, colon, val, semi) => {
      if (/\!important\s*$/i.test(val)) return m;
      return colon + val + " !important" + semi;
    });
  }).join("");
}

function setCSS(css, important = true, apply = true) {
  if (!apply) {
    // disable and return
    if (styleEl) styleEl.textContent = "";
    return;
  }
  const el = ensureStyleEl();
  el.textContent = important ? addImportant(css || "") : (css || "");
}

function disableCSS() {
  if (styleEl) styleEl.textContent = "";
}

browser.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "SET_CSS") {
    setCSS(msg.css || "", msg.important !== false, msg.apply !== false);
  }
  if (msg?.type === "TOGGLE") {
    if (msg.enabled) {
      setCSS(styleEl?.textContent || "", true, true);
    } else {
      disableCSS();
    }
  }
});

// announce to background so it can push current state
(function hello() {
  try {
    const host = location.hostname;
    browser.runtime.sendMessage({ type: "HELLO", host });
  } catch (_) {}
})();
