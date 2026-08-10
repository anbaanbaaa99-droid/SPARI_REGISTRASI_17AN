(() => {
  const CFG = window.SPARI_CONFIG || {};
  const $ = (id) => document.getElementById(id);

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

  async function api(payload) {
    if (!apiReady()) {
      throw new Error("API belum diatur. Isi API_URL pada config.js.");
    }
    const response = await fetch(CFG.API_URL, {
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(payload),
      redirect:"follow"
    });
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); }
    catch {
      throw new Error("Respons backend tidak valid. Pastikan memakai URL Apps Script /exec dan deployment terbaru.");
    }
    if (!data.ok) throw new Error(data.message || "Permintaan gagal.");
    return data;
  }

  let toastTimer;
  function toast(message, type="default") {
    let el = document.getElementById("appToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "appToast";
      el.className = "app-toast";
      document.body.appendChild(el);
    }
    el.dataset.type = type;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
  }

  function parseCode(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const u = new URL(raw);
      return (u.searchParams.get("code") || "").trim();
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
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch(() => {});
      });
    }
  }

  window.SPARI = {
    CFG, $, esc, rupiah, apiReady, api, toast, parseCode,
    statusClass, checkClass, registerSW
  };
})();
