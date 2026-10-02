// Ad Blocker — background service worker
"use strict";

const RULESET_ID = "blocklist";
const STORAGE_KEY = "enabled";

let blockedCount = 0;

function updateBadge(enabled) {
  if (!chrome.action) return;
  chrome.action.setBadgeText({ text: enabled ? "" : "OFF" });
  chrome.action.setBadgeBackgroundColor({ color: "#9E9E9E" });
}

async function setEnabled(enabled) {
  await chrome.storage.local.set({ [STORAGE_KEY]: enabled });
  try {
    if (enabled) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: [RULESET_ID]
      });
    } else {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: [RULESET_ID]
      });
    }
  } catch (e) {
    console.warn("updateEnabledRulesets failed:", e);
  }
  updateBadge(enabled);
}

async function bootstrap() {
  const res = await chrome.storage.local.get(STORAGE_KEY);
  const enabled = res[STORAGE_KEY] !== false;
  await setEnabled(enabled);
}

// Optional: count blocked requests (needs declarativeNetRequestFeedback).
try {
  if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
    chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(() => {
      blockedCount++;
      try {
        chrome.action.setBadgeText({ text: String(blockedCount) });
      } catch (e) {
        /* ignore */
      }
    });
  }
} catch (e) {
  /* ignore */
}

chrome.runtime.onInstalled.addListener(bootstrap);
chrome.runtime.onStartup.addListener(bootstrap);

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg !== "object") return false;

  if (msg.type === "setEnabled") {
    setEnabled(!!msg.enabled).then(() => sendResponse({ ok: true }));
    return true; // async response
  }

  if (msg.type === "getState") {
    chrome.storage.local.get(STORAGE_KEY, (res) => {
      sendResponse({ enabled: res[STORAGE_KEY] !== false, blocked: blockedCount });
    });
    return true; // async response
  }

  return false;
});

bootstrap();
