(function () {
  "use strict";

  var channels = window.CHANNELS;
  var video = document.getElementById("video");
  var playerOverlay = document.getElementById("playerOverlay");
  var playerLoading = document.getElementById("playerLoading");
  var playerError = document.getElementById("playerError");
  var errorMsg = document.getElementById("errorMsg");
  var retryBtn = document.getElementById("retryBtn");
  var nowPlaying = document.getElementById("nowPlaying");
  var channelGrid = document.getElementById("channelGrid");
  var categoryTabs = document.getElementById("categoryTabs");
  var searchInput = document.getElementById("search");

  var shakaPlayer = null;
  var hlsPlayer = null;
  var currentChannel = null;
  var currentCategory = "All";
  var searchQuery = "";
  var shakaInited = false;

  // Unique categories
  var categories = ["All"];
  var catSet = {};
  channels.forEach(function (ch) {
    if (!catSet[ch.category]) {
      catSet[ch.category] = true;
      categories.push(ch.category);
    }
  });

  // ── Category tabs ──
  function renderCategoryTabs() {
    categoryTabs.innerHTML = "";
    categories.forEach(function (cat) {
      var btn = document.createElement("button");
      btn.className = "cat-tab" + (cat === currentCategory ? " active" : "");
      var count = cat === "All" ? channels.length : channels.filter(function (c) { return c.category === cat; }).length;
      btn.textContent = cat + " (" + count + ")";
      btn.onclick = function () {
        currentCategory = cat;
        renderCategoryTabs();
        renderGrid();
      };
      categoryTabs.appendChild(btn);
    });
  }

  // ── Filter ──
  function getFiltered() {
    return channels.filter(function (ch) {
      var matchCat = currentCategory === "All" || ch.category === currentCategory;
      var matchSearch = !searchQuery || ch.title.toLowerCase().indexOf(searchQuery) !== -1 ||
        ch.category.toLowerCase().indexOf(searchQuery) !== -1;
      return matchCat && matchSearch;
    });
  }

  // ── Grid ──
  function renderGrid() {
    var filtered = getFiltered();
    channelGrid.innerHTML = "";
    filtered.forEach(function (ch) {
      var card = document.createElement("div");
      card.className = "grid-card" + (currentChannel && currentChannel.id === ch.id ? " active" : "");
      card.innerHTML =
        '<img src="' + (ch.logo || defaultLogo(ch.title)) + '" alt="" onerror="this.src=\'' + defaultLogo(ch.title) + '\'">' +
        '<div class="gc-title">' + esc(ch.title) + '</div>' +
        '<div class="gc-cat">' + esc(ch.category) + '</div>';
      card.onclick = function () { playChannel(ch); };
      channelGrid.appendChild(card);
    });
  }

  // ── Logo placeholder ──
  function defaultLogo(title) {
    var initials = title.split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase();
    var hue = Math.abs(hashCode(title)) % 360;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">' +
      '<rect width="64" height="64" rx="8" fill="hsl(' + hue + ',45%,25%)"/>' +
      '<text x="32" y="38" text-anchor="middle" font-size="20" font-weight="bold" fill="hsl(' + hue + ',70%,75%)" font-family="sans-serif">' + initials + '</text></svg>';
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }

  function hashCode(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return h;
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  // ── Shaka Player ──
  async function createShaka() {
    if (!window.shaka || !window.shaka.Player)
      throw new Error("Shaka Player failed to load.");
    if (!shakaInited) { shaka.polyfill.installAll(); shakaInited = true; }
    if (!shaka.Player.isBrowserSupported())
      throw new Error("Browser not supported by Shaka Player.");
    if (shakaPlayer) {
      try { await shakaPlayer.destroy(); } catch (_) {}
      shakaPlayer = null;
    }
    video.removeAttribute("src");
    video.load();
    shakaPlayer = new shaka.Player();
    await shakaPlayer.attach(video);
    shakaPlayer.addEventListener("error", function (e) {
      console.error("Shaka error:", e.detail);
    });
  }

  function isHlsUrl(url) {
    var l = url.trim().toLowerCase();
    return l.indexOf(".m3u8") !== -1 || l.indexOf("/hls") !== -1;
  }

  // ── Play channel ──
  async function playChannel(ch) {
    currentChannel = ch;
    playerOverlay.classList.add("hidden");
    playerError.classList.add("hidden");
    playerLoading.classList.remove("hidden");
    nowPlaying.classList.remove("hidden");

    document.getElementById("npTitle").textContent = ch.title;
    document.getElementById("npCategory").textContent = ch.category;
    document.getElementById("npDescription").textContent = ch.description || "";
    var npLogo = document.getElementById("npLogo");
    npLogo.src = ch.logo || defaultLogo(ch.title);
    npLogo.onerror = function () { this.src = defaultLogo(ch.title); };

    renderGrid();

    // Scroll player into view on mobile
    document.getElementById("playerWrap").scrollIntoView({ behavior: "smooth", block: "start" });

    if (hlsPlayer) { hlsPlayer.destroy(); hlsPlayer = null; }

    var url = ch.stream;
    var hasClearkey = ch.clearkey && typeof ch.clearkey === "object" && Object.keys(ch.clearkey).length > 0;
    var hls = isHlsUrl(url);
    var useNativeHls = hls && !hasClearkey && video.canPlayType("application/vnd.apple.mpegurl") !== "";

    try {
      if (useNativeHls) {
        if (shakaPlayer) { try { await shakaPlayer.destroy(); } catch (_) {} shakaPlayer = null; }
        video.src = url;
        video.load();
        playerLoading.classList.add("hidden");
        await video.play().catch(function () {});
      } else if (hls && !hasClearkey) {
        if (shakaPlayer) { await shakaPlayer.unload(); }
        if (window.Hls && Hls.isSupported()) {
          hlsPlayer = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
          hlsPlayer.loadSource(url);
          hlsPlayer.attachMedia(video);
          hlsPlayer.on(Hls.Events.MANIFEST_PARSED, function () {
            playerLoading.classList.add("hidden");
            video.play().catch(function () {});
          });
          hlsPlayer.on(Hls.Events.ERROR, function (event, data) {
            if (data.fatal) showError("HLS stream error");
          });
        } else {
          await createShaka();
          shakaPlayer.configure({ drm: { clearKeys: {} } });
          await shakaPlayer.load(url, null, "application/x-mpegurl");
          playerLoading.classList.add("hidden");
          await video.play().catch(function () {});
        }
      } else {
        await createShaka();
        shakaPlayer.configure({ drm: { clearKeys: {} } });
        if (hasClearkey) {
          var clearkeys = {};
          for (var kid in ch.clearkey) {
            if (ch.clearkey.hasOwnProperty(kid)) clearkeys[kid] = ch.clearkey[kid];
          }
          shakaPlayer.configure({ drm: { clearKeys: clearkeys } });
        }
        var mimeType = undefined;
        if (url.indexOf(".mpd") !== -1) mimeType = "application/dash+xml";
        else if (url.indexOf(".m3u8") !== -1) mimeType = "application/x-mpegurl";
        await shakaPlayer.load(url, null, mimeType);
        playerLoading.classList.add("hidden");
        await video.play().catch(function () {});
      }
    } catch (e) {
      console.error("Playback error:", e);
      showError("Failed to load stream: " + e.message);
      if (shakaPlayer) { try { await shakaPlayer.destroy(); } catch (_) {} shakaPlayer = null; }
    }

    window.location.hash = "ch=" + ch.id;
  }

  function showError(msg) {
    playerLoading.classList.add("hidden");
    playerError.classList.remove("hidden");
    errorMsg.textContent = msg;
  }

  retryBtn.onclick = function () { if (currentChannel) playChannel(currentChannel); };

  // ── Search ──
  searchInput.addEventListener("input", function () {
    searchQuery = this.value.toLowerCase().trim();
    renderGrid();
  });

  // ── Keyboard shortcuts ──
  document.addEventListener("keydown", function (e) {
    if (document.activeElement === searchInput) {
      if (e.key === "Escape") { searchInput.blur(); searchInput.value = ""; searchQuery = ""; renderGrid(); }
      return;
    }
    var filtered = getFiltered();
    var idx = -1;
    if (currentChannel) {
      for (var i = 0; i < filtered.length; i++) {
        if (filtered[i].id === currentChannel.id) { idx = i; break; }
      }
    }
    if (e.key === "ArrowUp" || e.key === "k") {
      e.preventDefault();
      if (idx > 0) playChannel(filtered[idx - 1]);
      else if (filtered.length) playChannel(filtered[filtered.length - 1]);
    } else if (e.key === "ArrowDown" || e.key === "j") {
      e.preventDefault();
      if (idx < filtered.length - 1) playChannel(filtered[idx + 1]);
      else if (filtered.length) playChannel(filtered[0]);
    } else if (e.key === "f") {
      if (document.fullscreenElement) document.exitFullscreen();
      else video.requestFullscreen().catch(function () {});
    } else if (e.key === " ") {
      e.preventDefault();
      if (video.paused) video.play(); else video.pause();
    } else if (e.key === "m") {
      video.muted = !video.muted;
    } else if (e.key === "/") {
      e.preventDefault();
      searchInput.focus();
    }
  });

  // ── Hash routing ──
  function loadFromHash() {
    var match = window.location.hash.match(/ch=(\d+)/);
    if (match) {
      var id = parseInt(match[1]);
      var ch = channels.find(function (c) { return c.id === id; });
      if (ch) { playChannel(ch); return; }
    }
  }

  // ── Init ──
  renderCategoryTabs();
  renderGrid();
  loadFromHash();
  window.addEventListener("hashchange", loadFromHash);
})();
