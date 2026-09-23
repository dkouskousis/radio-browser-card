const STORAGE_KEY = "radio_browser_card_v1";
const ROOT_ID = "media-source://radio_browser/";

const STRINGS = {
  en: {
    device: "Play on", choose: "Choose a player", search: "Search stations",
    placeholder: "Station name…", favorites: "Favorites", popular: "Popular",
    results: "Results", empty: "No favorites yet. Search for a station and tap the star.",
    noResults: "No stations found.", noPlayers: "No media players available.",
    stopped: "Stopped", stop: "Stop", play: "Play", volume: "Volume",
    searchButton: "Search", searching: "Searching…", loading: "Loading…",
    selectPlayer: "Select a player first.", favoriteError: "Could not save favorites",
    playError: "Could not play this station", browseError: "Could not load stations",
    current: "Now playing", retry: "Try again", loadingStorage: "Loading favorites…",
  },
  el: {
    device: "Αναπαραγωγή σε", choose: "Επίλεξε συσκευή", search: "Αναζήτηση σταθμών",
    placeholder: "Όνομα σταθμού…", favorites: "Αγαπημένα", popular: "Δημοφιλείς",
    results: "Αποτελέσματα", empty: "Δεν έχεις αγαπημένους. Βρες σταθμό και πάτησε το αστέρι.",
    noResults: "Δεν βρέθηκαν σταθμοί.", noPlayers: "Δεν υπάρχουν διαθέσιμες συσκευές.",
    stopped: "Σταμάτησε", stop: "Διακοπή", play: "Αναπαραγωγή", volume: "Ένταση",
    searchButton: "Αναζήτηση", searching: "Αναζήτηση…", loading: "Φόρτωση…",
    selectPlayer: "Επίλεξε πρώτα συσκευή.", favoriteError: "Δεν αποθηκεύτηκαν τα αγαπημένα",
    playError: "Δεν ξεκίνησε ο σταθμός", browseError: "Δεν φορτώθηκαν οι σταθμοί",
    current: "Παίζει τώρα", retry: "Προσπάθησε ξανά", loadingStorage: "Φόρτωση αγαπημένων…",
  },
};

const STYLE = `
  :host { display:block; color:var(--primary-text-color); }
  ha-card { padding:20px; overflow:hidden; }
  * { box-sizing:border-box; }
  .header { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:18px; }
  h2 { font-size:20px; font-weight:650; margin:0; }
  .eyebrow { color:var(--secondary-text-color); font-size:12px; margin:0 0 5px; }
  select, input[type=search] { font:inherit; color:var(--primary-text-color); background:var(--card-background-color, white); border:1px solid var(--divider-color, #ddd); border-radius:10px; padding:10px 12px; min-width:0; }
  select { width:100%; }
  label { display:block; font-size:13px; color:var(--secondary-text-color); margin-bottom:7px; }
  .search { display:flex; gap:8px; margin:18px 0 12px; }
  .search input { flex:1; width:0; }
  button { cursor:pointer; font:inherit; border:0; }
  .primary { border-radius:10px; background:var(--primary-color); color:var(--text-primary-color, white); padding:10px 14px; }
  button:disabled { opacity:.5; cursor:default; }
  .tabs { display:flex; gap:6px; border-bottom:1px solid var(--divider-color, #ddd); margin-bottom:8px; }
  .tab { background:none; color:var(--secondary-text-color); padding:10px 12px; border-bottom:2px solid transparent; }
  .tab.active { color:var(--primary-color); border-color:var(--primary-color); }
  .station { display:flex; align-items:center; gap:12px; padding:9px 2px; border-bottom:1px solid var(--divider-color, #ddd); }
  .station:last-child { border-bottom:0; }
  .logo { width:42px; height:42px; flex:none; border-radius:8px; object-fit:contain; background:var(--secondary-background-color, #eee); }
  .fallback-logo { display:grid; place-items:center; font-size:22px; }
  .name { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:500; }
  .icon { background:transparent; color:var(--primary-text-color); padding:7px; font-size:22px; line-height:1; border-radius:8px; }
  .icon.starred { color:var(--warning-color, #e6a900); }
  .icon:hover, .tab:hover { background:var(--secondary-background-color, #eee); }
  .message { padding:17px 4px; color:var(--secondary-text-color); font-size:14px; }
  .error { color:var(--error-color, #c33); }
  .player { border-radius:12px; background:var(--secondary-background-color, #eee); padding:14px; }
  .player-row { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .playing-title { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600; }
  .player button { flex:none; }
  .volume { display:flex; gap:12px; align-items:center; font-size:13px; margin-top:10px; }
  .volume input { flex:1; accent-color:var(--primary-color); }
  @media (max-width:440px) { ha-card { padding:15px; } .station { gap:6px; } .search .primary { padding:10px; } }
`;

class RadioBrowserCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._data = { favorites: [], player: "" };
    this._tab = "favorites";
    this._results = [];
    this._request = 0;
    this._loaded = false;
    this._connection = null;
  }

  setConfig(config) {
    this._config = config;
    this._data.player ||= config.default_player || "";
    this._renderShell();
    this._renderAll();
    if (this._hass && this._connection !== this._hass.connection) this._connectStorage();
  }

  set hass(hass) {
    const previous = this._hass;
    this._hass = hass;
    if (!this.shadowRoot.querySelector("ha-card")) return;
    if (previous?.connection !== hass.connection) this._connectStorage();
    this._renderPlayerPicker();
    this._renderNowPlaying();
  }

  connectedCallback() {
    if (this._hass && this._connection !== this._hass.connection) this._connectStorage();
  }

  disconnectedCallback() {
    this._unsubscribe?.();
    this._unsubscribe = null;
    this._connection = null;
  }

  getCardSize() { return 5; }

  _t(key) {
    return STRINGS[this._hass?.language?.startsWith("el") ? "el" : "en"][key];
  }

  _renderShell() {
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><ha-card>
      <div class="header"><h2 class="title"></h2></div>
      <label class="device-label" for="player"></label><select id="player"></select>
      <form class="search"><input type="search" required minlength="2"><button type="submit" class="primary search-button"></button></form>
      <nav class="tabs"><button type="button" class="tab favorites-tab" data-tab="favorites"></button><button type="button" class="tab popular-tab" data-tab="popular"></button><button type="button" class="tab results-tab" data-tab="results" hidden></button></nav>
      <div class="list" aria-live="polite"></div><div class="player"></div><div class="status" role="status"></div>
    </ha-card>`;
    this.shadowRoot.querySelector("#player").addEventListener("change", async (event) => {
      this._data.player = event.target.value;
      this._renderNowPlaying();
      await this._save();
    });
    this.shadowRoot.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      this._search(this.shadowRoot.querySelector("input[type=search]").value.trim());
    });
    this.shadowRoot.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => {
      this._tab = button.dataset.tab;
      this._renderList();
      if (this._tab === "popular" && !this._popular) this._loadPopular();
    }));
  }

  _renderAll() {
    if (!this.shadowRoot.querySelector("ha-card")) return;
    const $ = (selector) => this.shadowRoot.querySelector(selector);
    $(".title").textContent = this._config.title || "Radio Browser";
    $(".device-label").textContent = this._t("device");
    $("input[type=search]").placeholder = this._t("placeholder");
    $("input[type=search]").setAttribute("aria-label", this._t("search"));
    $(".search-button").textContent = this._t("searchButton");
    $(".favorites-tab").textContent = this._t("favorites");
    $(".popular-tab").textContent = this._t("popular");
    $(".results-tab").textContent = this._t("results");
    this._renderPlayerPicker();
    this._renderList();
    this._renderNowPlaying();
  }

  _renderPlayerPicker() {
    const picker = this.shadowRoot.querySelector("#player");
    if (!picker || !this._hass) return;
    const configured = this._config.entities;
    const ids = Array.isArray(configured) ? configured : Object.keys(this._hass.states).filter((id) => id.startsWith("media_player."));
    const players = ids.filter((id) => this._hass.states[id]).sort((a, b) =>
      (this._hass.states[a].attributes.friendly_name || a).localeCompare(this._hass.states[b].attributes.friendly_name || b));
    const signature = `${players.join("|")}|${players.map((id) => this._hass.states[id].attributes.friendly_name).join("|")}`;
    if (signature !== this._playersSignature) {
      picker.replaceChildren();
      picker.add(new Option(players.length ? this._t("choose") : this._t("noPlayers"), ""));
      for (const id of players) picker.add(new Option(this._hass.states[id].attributes.friendly_name || id, id));
      this._playersSignature = signature;
    }
    picker.value = players.includes(this._data.player) ? this._data.player : "";
  }

  _renderNowPlaying() {
    const container = this.shadowRoot.querySelector(".player");
    if (!container || !this._hass) return;
    container.replaceChildren();
    const entity = this._hass.states[this._data.player];
    if (!entity) { container.hidden = true; return; }
    container.hidden = false;
    const row = document.createElement("div"); row.className = "player-row";
    const text = document.createElement("div"); text.style.minWidth = "0";
    const eyebrow = document.createElement("p"); eyebrow.className = "eyebrow";
    eyebrow.textContent = `${this._t("current")} · ${entity.state}`;
    const title = document.createElement("div"); title.className = "playing-title";
    title.textContent = entity.attributes.media_title || entity.attributes.app_name || entity.attributes.friendly_name || this._t("stopped");
    text.append(eyebrow, title);
    const stop = document.createElement("button"); stop.className = "primary";
    stop.textContent = this._t("stop"); stop.disabled = !["playing", "paused", "buffering"].includes(entity.state);
    stop.addEventListener("click", () => this._call("media_stop", { entity_id: this._data.player }));
    row.append(text, stop); container.append(row);
    if (typeof entity.attributes.volume_level === "number") {
      const wrap = document.createElement("label"); wrap.className = "volume";
      const caption = document.createElement("span"); caption.textContent = this._t("volume");
      const slider = document.createElement("input"); slider.type = "range"; slider.min = "0"; slider.max = "100";
      slider.value = String(Math.round(entity.attributes.volume_level * 100));
      slider.setAttribute("aria-label", this._t("volume"));
      slider.addEventListener("change", () => this._call("volume_set", { entity_id: this._data.player, volume_level: Number(slider.value) / 100 }));
      wrap.append(caption, slider); container.append(wrap);
    }
  }

  _renderList() {
    const list = this.shadowRoot.querySelector(".list");
    if (!list) return;
    this.shadowRoot.querySelectorAll("[data-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === this._tab);
      button.setAttribute("aria-pressed", String(button.dataset.tab === this._tab));
    });
    this.shadowRoot.querySelector(".results-tab").hidden = this._tab !== "results";
    list.replaceChildren();
    const items = this._tab === "favorites" ? this._data.favorites : this._tab === "popular" ? (this._popular || []) : this._results;
    if (!items.length || this._busy) {
      const message = document.createElement("div"); message.className = "message";
      message.textContent = this._busy ? this._t("loading") : this._tab === "favorites" ? (this._loaded ? this._t("empty") : this._t("loadingStorage")) : this._t("noResults");
      list.append(message); return;
    }
    for (const station of items) {
      const row = document.createElement("div"); row.className = "station";
      const logo = station.thumbnail && /^https?:\/\//i.test(station.thumbnail) ? document.createElement("img") : document.createElement("span");
      logo.className = "logo" + (logo.tagName === "SPAN" ? " fallback-logo" : "");
      if (logo.tagName === "IMG") { logo.src = station.thumbnail; logo.alt = ""; logo.referrerPolicy = "no-referrer"; }
      else logo.textContent = "♫";
      const name = document.createElement("span"); name.className = "name"; name.textContent = station.title; name.title = station.title;
      const fav = document.createElement("button"); fav.type = "button";
      const starred = this._data.favorites.some((item) => item.media_content_id === station.media_content_id);
      fav.className = "icon" + (starred ? " starred" : ""); fav.textContent = starred ? "★" : "☆";
      fav.setAttribute("aria-label", `${this._t("favorites")}: ${station.title}`);
      fav.addEventListener("click", () => this._toggleFavorite(station));
      const play = document.createElement("button"); play.type = "button"; play.className = "icon";
      play.textContent = "▶"; play.title = this._t("play"); play.setAttribute("aria-label", `${this._t("play")}: ${station.title}`);
      play.addEventListener("click", () => this._play(station));
      row.append(logo, name, fav, play); list.append(row);
    }
  }

  async _connectStorage() {
    this._unsubscribe?.();
    this._connection = this._hass.connection;
    this._loaded = false;
    this._renderList();
    try {
      this._unsubscribe = await this._connection.subscribeMessage((event) => {
        const value = event.value;
        if (value && Array.isArray(value.favorites)) {
          this._data = { favorites: value.favorites.filter((s) => typeof s.media_content_id === "string"), player: value.player || "" };
        }
        this._loaded = true;
        this._renderPlayerPicker(); this._renderNowPlaying(); this._renderList();
      }, { type: "frontend/subscribe_user_data", key: STORAGE_KEY });
    } catch (error) { this._status(`${this._t("favoriteError")}: ${error.message}`, true); }
  }

  async _save() {
    try { await this._hass.callWS({ type: "frontend/set_user_data", key: STORAGE_KEY, value: this._data }); }
    catch (error) { this._status(`${this._t("favoriteError")}: ${error.message}`, true); }
  }

  async _toggleFavorite(station) {
    const old = this._data.favorites;
    this._data.favorites = old.some((s) => s.media_content_id === station.media_content_id)
      ? old.filter((s) => s.media_content_id !== station.media_content_id)
      : [...old, { title: station.title, media_content_id: station.media_content_id,
        media_content_type: station.media_content_type, thumbnail: station.thumbnail || "" }];
    this._renderList();
    await this._save();
  }

  async _search(query) {
    if (query.length < 2) return;
    const request = ++this._request;
    this._tab = "results"; this._busy = true; this._renderList(); this._status("");
    try {
      const data = await this._hass.callWS({ type: "media_source/search_media", media_content_id: ROOT_ID, search_query: query });
      if (request === this._request) this._results = data.result.filter((s) => s.can_play && s.media_content_id?.startsWith(ROOT_ID));
    } catch (error) { if (request === this._request) this._status(`${this._t("browseError")}: ${error.message}`, true); }
    finally { if (request === this._request) { this._busy = false; this._renderList(); } }
  }

  async _loadPopular() {
    this._busy = true; this._renderList(); this._status("");
    try {
      const data = await this._hass.callWS({ type: "media_source/browse_media", media_content_id: `${ROOT_ID}popular` });
      this._popular = (data.children || []).filter((s) => s.can_play && s.media_content_id?.startsWith(ROOT_ID));
    } catch (error) { this._status(`${this._t("browseError")}: ${error.message}`, true); }
    finally { this._busy = false; this._renderList(); }
  }

  async _play(station) {
    if (!this._data.player || this.shadowRoot.querySelector("#player").value !== this._data.player) {
      this._status(this._t("selectPlayer"), true); return;
    }
    this._status("");
    try {
      await this._hass.callService("media_player", "play_media", {
        entity_id: this._data.player,
        media_content_id: station.media_content_id,
        media_content_type: station.media_content_type,
      });
    } catch (error) { this._status(`${this._t("playError")}: ${error.message}`, true); }
  }

  async _call(service, data) {
    try { await this._hass.callService("media_player", service, data); }
    catch (error) { this._status(error.message, true); }
  }

  _status(message, error = false) {
    const node = this.shadowRoot.querySelector(".status");
    if (!node) return;
    node.textContent = message;
    node.className = "status" + (error ? " message error" : "");
  }
}

customElements.define("radio-browser-card", RadioBrowserCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "radio-browser-card", name: "Radio Browser Card", description: "Search and play Radio Browser stations with favorites." });
