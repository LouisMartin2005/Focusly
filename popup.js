// ✅ popup.js — Updated to keep selected mode red when active

document.addEventListener("DOMContentLoaded", () => {
  const modeListWrapper = document.getElementById("modeListWrapper");
  const modeList = document.getElementById("modeList");
  const modeOptions = document.getElementById("modeOptions");
  const settingsBtn = document.getElementById("settingsBtn");
  const openSettingsLink = document.getElementById("openSettingsLink");
  const turnOffBtn = document.getElementById("turnOff");
  const turnOnBtn = document.getElementById("turnOn");

  let selectedMode = null;
  let activeMode = null;

  function createModeOption(name) {
    const div = document.createElement("div");
    div.className = "mode-option";
    div.dataset.mode = name;

    let icon = "fa-circle";
    if (name.toLowerCase().includes("work")) icon = "fa-briefcase";
    else if (name.toLowerCase().includes("study")) icon = "fa-book";
    else if (name.toLowerCase().includes("sport")) icon = "fa-dumbbell";
    else if (name.toLowerCase().includes("disturb")) icon = "fa-ban";

    div.innerHTML = `<i class="fas ${icon}"></i> ${name}`;
    div.addEventListener("click", () => handleModeClick(div));
    return div;
  }

  function loadModes(customModes = [], currentActive = null) {
    activeMode = currentActive;
    modeList.innerHTML = "";
    const dnd = createModeOption("Do Not Disturb");
    modeList.appendChild(dnd);

    customModes.forEach(mode => {
      if (mode !== "Do Not Disturb") {
        const opt = createModeOption(mode);
        modeList.appendChild(opt);
      }
    });

    if (activeMode) {
      const current = [...document.querySelectorAll(".mode-option")]
        .find(el => el.dataset.mode === activeMode);
      if (current) {
        current.classList.add("selected");
      }
    }

    const addBtn = document.createElement("button");
    addBtn.id = "addNewMode";
    addBtn.innerHTML = '<i class="fas fa-plus"></i> Create New Focus Mode';
    addBtn.addEventListener("click", () => {
      const rawMode = prompt("Enter a name for your new focus mode:");
      if (!rawMode) return;
      const newMode = rawMode.trim();

      chrome.storage.local.get("customModes", (res) => {
        let customModes = Array.isArray(res.customModes) ? res.customModes : [];
        if (!customModes.includes(newMode)) {
          customModes.push(newMode);
          chrome.storage.local.set({ customModes }, () => {
            chrome.tabs.create({ url: `settings.html?mode=${encodeURIComponent(newMode)}` });
          });
        } else {
          chrome.tabs.create({ url: `settings.html?mode=${encodeURIComponent(newMode)}` });
        }
      });
    });
    modeList.appendChild(addBtn);
  }

  function handleModeClick(option) {
    selectedMode = option.dataset.mode;
    option.insertAdjacentElement("afterend", modeOptions);
    modeOptions.classList.remove("hidden");
  }

  // what happens when you click the setting button 
  settingsBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: "settings.html" });
  });

  openSettingsLink.addEventListener("click", () => {
    if (selectedMode) {
      chrome.tabs.create({ url: `settings.html?mode=${encodeURIComponent(selectedMode)}` });
    }
  });

  turnOnBtn.addEventListener("click", () => {
    if (!selectedMode) return;

    chrome.runtime.sendMessage({ action: "enableFocusMode", mode: selectedMode });
    chrome.storage.local.set({ activeFocusMode: selectedMode });

    document.querySelectorAll(".mode-option").forEach(el => el.classList.remove("selected"));
    const selectedEl = [...document.querySelectorAll(".mode-option")].find(el => el.dataset.mode === selectedMode);
    if (selectedEl) selectedEl.classList.add("selected");

    modeOptions.classList.add("hidden");
  });

  turnOffBtn.addEventListener("click", () => {
    selectedMode = null;
    chrome.runtime.sendMessage({ action: "disableFocusMode" });
    chrome.storage.local.remove("activeFocusMode", () => {
      document.querySelectorAll(".mode-option").forEach(el => el.classList.remove("selected"));
      modeOptions.classList.add("hidden");
    });
  });

  chrome.storage.local.get(["customModes", "activeFocusMode"], (res) => {
    const modes = Array.isArray(res.customModes) ? res.customModes : [];
    const active = res.activeFocusMode || null;
    loadModes(modes, active);
  });
});
