// ✅ background.js — Clean, Fixed Version with WebNavigation and Tab Restore

let lastBlockedTabUrl = {};
const BLOCKED_PAGE = chrome.runtime.getURL("blocked.html");

let activeBlocklist = [];
let isAllowMode = false;
let isEnabled = false;

// ✅ Handle messages from popup.js (turn on/off modes)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "enableFocusMode") {
    const modeName = message.mode;

    chrome.storage.local.get(modeName, (res) => {
      const config = res[modeName];
      console.log("[DEBUG] Retrieved mode config:", res);

      if (!config || !Array.isArray(config.sites) || config.sites.length === 0) {
        console.warn("[Focusly] No valid sites found for mode:", modeName);
        isEnabled = false;
        return;
      }

      // ✅ Set state AFTER config is fully loaded
      activeBlocklist = config.sites.map(site => site.replace(/^www\./, ""));
      isAllowMode = config.allowMode;
      isEnabled = true;

      console.log("[Focusly] Focus mode enabled:", {
        mode: modeName,
        sites: activeBlocklist,
        allowMode: isAllowMode
      });
    });

    // ✅ return true allows asynchronous `sendResponse` safely
    return true;
  }

  if (message.action === "disableFocusMode") {
    isEnabled = false;
    activeBlocklist = [];
    isAllowMode = false;
    console.log("[Focusly] Focus mode disabled.");

    for (const [tabIdStr, originalUrl] of Object.entries(lastBlockedTabUrl)) {
      const tabId = parseInt(tabIdStr);
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) return;

        if (tab.url.includes("blocked.html")) {
          chrome.tabs.update(tab.id, { url: originalUrl });
        }
      });
    }

    lastBlockedTabUrl = {};
  }
});


// ✅ Block site if needed when navigating
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  try {
    if (!isEnabled) return;

    const url = new URL(details.url);
    const domain = url.hostname.replace(/^www\./, "");

    const isMatch = activeBlocklist.some(site => domain.includes(site));
    const shouldBlock = isAllowMode ? !isMatch : isMatch;

    console.log("[Focusly]", {
      currentDomain: domain,
      allowMode: isAllowMode,
      siteList: activeBlocklist,
      shouldBlock
    });

    if (shouldBlock && !details.url.startsWith(BLOCKED_PAGE)) {
      lastBlockedTabUrl[details.tabId] = details.url;

      chrome.tabs.update(details.tabId, {
        url: BLOCKED_PAGE
      });
    }
  } catch (err) {
    console.error("[Focusly Error]", err);
  }
}, {
  url: [{ schemes: ["http", "https"] }]
});
