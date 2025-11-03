// background.js
// MV3 service worker

function getHost(url) {
  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:") return u.hostname;
  } catch (e) {}
  return null;
}

async function getSiteState(host) {
  const { sites = {} } = await browser.storage.local.get("sites");
  return sites[host] || { enabled: false, css: "", important: true };
}

async function setSiteState(host, state) {
  const data = await browser.storage.local.get("sites");
  const sites = data.sites || {};
  sites[host] = state;
  await browser.storage.local.set({ sites });
}

async function applyIfEnabled(tabId, url) {
  const host = getHost(url);
  if (!host) return;
  const state = await getSiteState(host);
  if (state.enabled && state.css) {
    try {
      await browser.tabs.sendMessage(tabId, { type: "SET_CSS", css: state.css, important: state.important });
    } catch (e) {
      // ignore tabs that don't accept messages (e.g., AMO, internal pages)
    }
  } else {
    try {
      await browser.tabs.sendMessage(tabId, { type: "TOGGLE", enabled: false });
    } catch (e) {}
  }
}

browser.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg?.type === "HELLO") {
    const state = await getSiteState(msg.host);
    if (sender.tab?.id) {
      try {
        await browser.tabs.sendMessage(sender.tab.id, { type: "SET_CSS", css: state.css, important: state.important, apply: state.enabled });
      } catch (e) {}
    }
    return;
  }
  if (msg?.type === "SAVE_SITE_STATE") {
    const { host, state } = msg;
    await setSiteState(host, state);
    if (msg.apply && msg.tabId) {
      await applyIfEnabled(msg.tabId, msg.url);
    }
    return;
  }
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" || changeInfo.url) {
    applyIfEnabled(tabId, changeInfo.url || tab.url);
  }
});
