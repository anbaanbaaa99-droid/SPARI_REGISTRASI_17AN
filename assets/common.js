(() => {
  "use strict";

  const CFG = window.SPARI_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const scriptPromises = new Map();

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));

  const rupiah = (n) => new Intl.NumberFormat("id-ID", {
    style:"currency", currency:"IDR", maximumFractionDigits:0
  }).format(Number(n) || 0);

  const apiReady = () =>
    !!CFG.API_URL &&
    !CFG.API_URL.includes("PASTE_") &&
    /\/exec(?:\?|$)/.test(CFG.API_URL);

  function loadScript(src, key=src) {
    if (scriptPromises.has(key)) return scriptPromises.get(key);

    const existing = [...document.scripts].find(s => s.dataset.dynamicKey === key);
    if (existing?.dataset.loaded === "1") return Promise.resolve();

    const promise = new Promise((resolve, reject) => {
      const script = existing || document.createElement("script");
      if (!existing) {
        script.src = src;
        script.async = true;
        script.crossOrigin = "anonymous";
        script.dataset.dynamicKey = key;
        document.head.appendChild(script);
      }
      script.addEventListener("load", () => {
        script.dataset.loaded = "1";
        resolve();
      }, {once:true});
      script.addEventListener("error", () => reject(new Error("Komponen tambahan gagal dimuat. Periksa koneksi internet.")), {once:true});
    });

    scriptPromises.set(key, promise);
    return promise;
  }

  async function api(payload, {timeout=18000}={}) {
    if (!apiReady()) {
      throw new Error("API belum diatur. Isi API_URL pada config.js.");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(CFG.API_URL, {
        method:"POST",
        headers:{"Content-Type":"text/plain;charset=utf-8"},
        body:JSON.stringify(payload),
        redirect:"follow",
        cache:"no-store",
        credentials:"omit",
        referrerPolicy:"no-referrer",
        signal:controller.signal
      });

      if (!response.ok) {
        throw new Error(`Server merespons HTTP ${response.status}.`);
      }

      const raw = await response.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error("Respons backend tidak valid. Pastikan deployment Apps Script /exec terbaru dan aksesnya Anyone.");
      }

      if (!data?.ok) throw new Error(data?.message || "Permintaan gagal.");
      return data;
    } catch (err) {
      if (err?.name === "AbortError") {
        throw new Error("Server terlalu lama merespons. Coba lagi beberapa saat.");
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  let toastTimer;
  function toast(message, type="default", duration=3200) {
    let el = document.getElementById("appToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "appToast";
      el.className = "app-toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.dataset.type = type;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), duration);
  }

  function parseCode(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const u = new URL(raw);
      return (u.searchParams.get("code") || "").trim().toUpperCase();
    } catch {}
    const match = raw.match(/SPARI81-[A-Z0-9-]+/i);
    return match ? match[0].toUpperCase() : raw.toUpperCase();
  }

  function statusClass(status) {
    if (status === "Sudah Bayar") return "is-paid";
    if (status === "Gratis") return "is-free";
    return "is-unpaid";
  }

  function checkClass(status) {
    return status === "Hadir" ? "is-present" : "is-absent";
  }

  function registerSW() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js", {updateViaCache:"none"}).catch(() => {});
    }, {once:true});
  }

  window.SPARI = {
    CFG, $, esc, rupiah, apiReady, api, toast, parseCode,
    statusClass, checkClass, registerSW, loadScript
  };
})();
