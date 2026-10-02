"use strict";

const toggle = document.getElementById("toggle");
const countEl = document.getElementById("count");

function loadState() {
  chrome.runtime.sendMessage({ type: "getState" }, (res) => {
    if (chrome.runtime.lastError || !res) return;
    toggle.checked = res.enabled;
    countEl.textContent = String(res.blocked);
  });
}

toggle.addEventListener("change", () => {
  chrome.runtime.sendMessage({ type: "setEnabled", enabled: toggle.checked });
});

loadState();
