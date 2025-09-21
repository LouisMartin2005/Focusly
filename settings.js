document.addEventListener("DOMContentLoaded", () => {
  const siteList = document.getElementById("siteList");
  const input = document.getElementById("siteInput");
  const addSiteBtn = document.getElementById("addSiteBtn");
  const profileTitle = document.getElementById("profileTitle");
  const saveAllBtn = document.getElementById("saveAllBtn");
  const removeBtn = document.getElementById("removeModeBtn");
  const editTitleBtn = document.getElementById("editTitleBtn");
  const titleInput = document.getElementById("titleInput");
  const emptyState = document.getElementById("emptyState");
  const domainWarning = document.getElementById("domainWarning");

  let sites = [];
  let modeName = null;

  function updateEmpty() {
    if (!emptyState || !siteList) return;
    emptyState.classList.toggle("hidden", siteList.children.length > 0);
  }

  function startTitleEdit() {
    titleInput.value = modeName || "";
    profileTitle.classList.add("hidden");
    editTitleBtn.classList.add("hidden");
    titleInput.classList.remove("hidden");
    titleInput.focus();
    titleInput.select();
  }

  function endTitleEdit(cancel=false) {
    if (cancel) {
      titleInput.classList.add("hidden");
      profileTitle.classList.remove("hidden");
      editTitleBtn.classList.remove("hidden");
      return;
    }
    const raw = titleInput.value.trim();
    const newName = raw.replace(/\s+/g, " ");
    if (!newName || newName === modeName) {
      titleInput.classList.add("hidden");
      profileTitle.classList.remove("hidden");
      editTitleBtn.classList.remove("hidden");
      return;
    }
    chrome.storage.local.get(["customModes", modeName], (res) => {
      const modes = Array.isArray(res.customModes) ? res.customModes : [];
      if (modes.includes(newName)) {
        alert("A focus mode with that name already exists.");
        titleInput.focus();
        return;
      }
      const existing = res[modeName] || {};
      const dataToSave = { ...existing, sites };
      chrome.storage.local.set(
        { [newName]: dataToSave, customModes: modes.map(m => m === modeName ? newName : m) },
        () => {
          chrome.storage.local.remove(modeName, () => {
            modeName = newName;
            profileTitle.textContent = newName;
            document.title = `Focus Mode — ${newName}`;
            history.replaceState(null, "", `?mode=${encodeURIComponent(newName)}`);
            titleInput.classList.add("hidden");
            profileTitle.classList.remove("hidden");
            editTitleBtn.classList.remove("hidden");
          });
        }
      );
    });
  }

  function loadSavedSettings() {
    chrome.storage.local.get([modeName], (res) => {
      const data = res[modeName];
      if (data) {
        sites = Array.isArray(data.sites) ? data.sites : [];
      }
      renderSites();
    });
  }

  function normalizeDomain(v) {
    return (v || "")
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0];
  }
  function isLikelyDomain(v) {
    v = normalizeDomain(v);
    return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/i.test(v);
  }
  function showWarn(show) {
    if (!domainWarning) return;
    domainWarning.classList.toggle("hidden", !show);
  }

  function renderSites() {
    siteList.innerHTML = "";
    sites.forEach((site, idx) => {
      const li = document.createElement("li");
      li.className = "site-chip blocked";

      const wrap = document.createElement("div");
      wrap.className = "icon-wrap";

      const img = document.createElement("img");
      img.alt = site;
      img.loading = "lazy";
      img.src = `https://www.google.com/s2/favicons?domain=${site}&sz=128`;
      img.onerror = () => {
        img.onerror = null;
        img.src = `https://icons.duckduckgo.com/ip3/${site}.ico`;
        img.onerror = () => {
          img.onerror = null;
          img.src = `https://logo.clearbit.com/${site}`;
        };
      };

      const blocked = document.createElement("span");
      blocked.className = "blocked-overlay";
      blocked.title = "Blocked";

      const remove = document.createElement("button");
      remove.className = "remove-chip";
      remove.setAttribute("aria-label", `Remove ${site}`);
      remove.innerHTML = "&times;";
      remove.addEventListener("click", (e) => {
        e.stopPropagation();
        sites.splice(idx, 1);
        renderSites();
      });

      const label = document.createElement("span");
      label.className = "site-label";
      label.textContent = site;

      wrap.appendChild(img);
      wrap.appendChild(blocked);
      li.appendChild(remove);
      li.appendChild(wrap);
      li.appendChild(label);
      siteList.appendChild(li);
    });
    updateEmpty();
  }

  /* Events */
  editTitleBtn?.addEventListener("click", startTitleEdit);
  titleInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") endTitleEdit(false);
    if (e.key === "Escape") endTitleEdit(true);
  });
  titleInput?.addEventListener("blur", () => endTitleEdit(false));

  addSiteBtn?.addEventListener("click", () => {
    const raw = input.value;
    if (!isLikelyDomain(raw)) {
      showWarn(true);
      return;
    }
    const site = normalizeDomain(raw);
    if (site && !sites.includes(site)) {
      sites.push(site);
      renderSites();
    }
    input.value = "";
    showWarn(false);
  });

  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSiteBtn?.click();
    }
  });

  saveAllBtn?.addEventListener("click", () => {
    const data = { allowMode: false, sites };
    chrome.storage.local.set({ [modeName]: data }, () => {
      chrome.storage.local.get("customModes", (res) => {
        let modes = Array.isArray(res.customModes) ? res.customModes : [];
        if (!modes.includes(modeName)) modes.push(modeName);
        chrome.storage.local.set({ customModes: modes }, () => {
          alert("Focus mode settings saved!");
          window.close();
        });
      });
    });
  });

  removeBtn?.addEventListener("click", () => {
    if (!modeName) return alert("No mode to remove.");
    chrome.storage.local.get("customModes", (res) => {
      let customModes = Array.isArray(res.customModes) ? res.customModes : [];
      const updated = customModes.filter(m => m !== modeName);
      chrome.storage.local.set({ customModes: updated }, () => {
        chrome.storage.local.remove(modeName, () => {
          alert(`Focus mode "${modeName}" removed.`);
          window.close();
        });
      });
    });
  });

  // Init
  if (addSiteBtn && !addSiteBtn.title) addSiteBtn.title = "Add to list";
  if (input && !input.placeholder) input.placeholder = "Add a site to block (e.g., youtube.com)";

  const urlParams = new URLSearchParams(window.location.search);
  modeName = urlParams.get("mode");
  if (!modeName) {
    alert("No focus mode name provided in the URL.");
    return;
  }
  profileTitle.textContent = modeName;
  loadSavedSettings();
  updateEmpty();
});
