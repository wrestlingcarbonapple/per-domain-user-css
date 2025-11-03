// popup.js
function getHost(url) {
  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:") return u.hostname;
  } catch (e) {}
  return null;
}

async function getActiveTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function load() {
  const statusEl = document.getElementById("status");
  const errorEl = document.getElementById("error");
  statusEl.textContent = "";
  errorEl.textContent = "";

  const tab = await getActiveTab();
  const host = getHost(tab?.url);
  document.getElementById("host").textContent = host || "(unsupported page)";

  const enabledEl = document.getElementById("enabled");
  const importantEl = document.getElementById("important");
  const cssEl = document.getElementById("css");
  const previewBtn = document.getElementById("preview");
  const saveBtn = document.getElementById("save");

  const disableUI = (why) => {
    [enabledEl, importantEl, cssEl, previewBtn, saveBtn].forEach(el => el.disabled = true);
    statusEl.textContent = why || "This page does not allow custom CSS.";
  };

  if (!host) {
    disableUI("This page does not have an http(s) hostname.");
    return;
  }

  // Load existing
  const { sites = {} } = await browser.storage.local.get("sites");
  const state = sites[host] || { enabled: false, css: "", important: true };
  enabledEl.checked = !!state.enabled;
  importantEl.checked = state.important !== false;
  cssEl.value = state.css || "";

  enabledEl.addEventListener("change", async () => {
    const newState = { ...state, enabled: enabledEl.checked };
    sites[host] = newState;
    await browser.storage.local.set({ sites });
    try {
      await browser.tabs.sendMessage(tab.id, { type: "TOGGLE", enabled: newState.enabled });
      statusEl.textContent = newState.enabled ? "Enabled for this domain." : "Disabled for this domain.";
    } catch (e) {
      errorEl.textContent = "Cannot communicate with this page.";
    }
  });

  previewBtn.addEventListener("click", async () => {
    const css = cssEl.value;
    const important = importantEl.checked;
    try {
      await browser.tabs.sendMessage(tab.id, { type: "SET_CSS", css, important, apply: true });
      statusEl.textContent = "Preview applied. Not saved.";
    } catch (e) {
      errorEl.textContent = "Preview failed on this page.";
    }
  });

  saveBtn.addEventListener("click", async () => {
    const css = cssEl.value;
    const important = importantEl.checked;
    const newState = { enabled: true, css, important };
    sites[host] = newState;
    await browser.storage.local.set({ sites });
    try {
      await browser.runtime.sendMessage({ type: "SAVE_SITE_STATE", host, state: newState, apply: true, tabId: tab.id, url: tab.url });
      statusEl.textContent = "Saved and enabled for this domain.";
      enabledEl.checked = true;
    } catch (e) {
      errorEl.textContent = "Save failed.";
    }
  });
}

document.addEventListener("DOMContentLoaded", load);
