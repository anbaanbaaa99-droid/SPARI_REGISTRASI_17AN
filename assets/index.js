const { $, api, rupiah, toast, registerSW, loadScript } = SPARI;

let PUBLIC = null;
let EVENTS = [];
let selectedEvent = null;
let latestCode = "";

const PUBLIC_CACHE_KEY = "spari_public_config_v8";
const PUBLIC_CACHE_TTL = 2 * 60 * 1000;
const QR_SRC = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
const SITE_DATA = window.SPARI_SITE_DATA || {};
const PAYMENT_WA = SITE_DATA.paymentWhatsapp || "6285813035634";
const EVENT_META = SITE_DATA.eventMeta || {};

registerSW();

function renderAgenda() {
  const wrap = $("agendaTimeline");
  const agenda = Array.isArray(SITE_DATA.agenda) ? SITE_DATA.agenda : [];
  if (!wrap) return;
  if (!agenda.length) {
    wrap.innerHTML = '<div class="agenda-loading">Jadwal terbaru akan diumumkan panitia.</div>';
    return;
  }
  wrap.innerHTML = agenda.map(item => {
    const lines = Array.isArray(item.lines) ? item.lines.map(line => SPARI.esc(line)).join("<br>") : "";
    const tags = Array.isArray(item.tags) && item.tags.length
      ? `<div class="timeline-tags">${item.tags.map(tag => `<span>${SPARI.esc(tag)}</span>`).join("")}</div>`
      : "";
    return `<article class="timeline-card ${item.featured ? "featured" : ""} ${item.wide ? "wide" : ""}">
      <div class="timeline-date"><b>${SPARI.esc(item.date || "--")}</b><span>${SPARI.esc(item.month || "")}<br>${SPARI.esc(item.day || "")}</span></div>
      <div class="timeline-main">
        <div class="timeline-label">${SPARI.esc(item.label || "")}</div>
        <h3>${SPARI.esc(item.title || "")}</h3>
        ${lines ? `<p>${lines}</p>` : ""}
        ${tags}
      </div>
      ${item.wide ? "" : '<span class="timeline-arrow">↗</span>'}
    </article>`;
  }).join("");
}

renderAgenda();

function readCachedPublic() {
  try {
    const cached = JSON.parse(localStorage.getItem(PUBLIC_CACHE_KEY) || "null");
    if (!cached?.data || !cached?.time) return null;
    if (Date.now() - cached.time > PUBLIC_CACHE_TTL) return null;
    return cached.data;
  } catch { return null; }
}

function writeCachedPublic(data) {
  try { localStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify({time:Date.now(), data})); } catch {}
}

function setLoadingUI(loading) {
  const eventSelect = $("eventId");
  const submit = $("submitBtn");
  if (eventSelect) eventSelect.disabled = loading && !EVENTS.length;
  if (submit && !PUBLIC) submit.disabled = loading;
}

async function boot() {
  const cached = readCachedPublic();
  if (cached) {
    PUBLIC = cached;
    EVENTS = cached.events || [];
    renderPublicConfig();
  }

  setLoadingUI(true);
  try {
    const fresh = await api({action:"publicConfig"});
    PUBLIC = fresh;
    EVENTS = fresh.events || [];
    writeCachedPublic(fresh);
    renderPublicConfig();
  } catch (err) {
    if (!PUBLIC) {
      $("registrationState").textContent = "Gagal terhubung ke server.";
      $("heroRegState").textContent = "Server unavailable";
      $("eventId").innerHTML = '<option value="">Cabang lomba gagal dimuat</option>';
      $("eventId").disabled = true;
      $("submitBtn").disabled = true;
      $("eventShowcase").innerHTML = '<div class="showcase-error">Daftar cabang belum bisa dimuat. Coba refresh beberapa saat lagi.</div>';
      toast(err.message, "error", 4500);
    } else {
      toast("Menggunakan data tersimpan. Server belum merespons.", "error");
    }
  } finally { setLoadingUI(false); }
}

function renderPublicConfig() {
  const settings = PUBLIC?.settings || {};
  const isOpen = !!settings.registrationOpen;

  $("registrationState").textContent = isOpen ? "Pendaftaran sedang dibuka." : "Pendaftaran sedang ditutup oleh panitia.";
  $("heroRegState").textContent = isOpen ? "Open now" : "Closed";

  const currentValue = $("eventId").value;
  $("eventId").innerHTML = '<option value="">— Pilih lomba —</option>' +
    EVENTS.map(ev => {
      const closed = ev.status !== "OPEN" || (ev.quota > 0 && ev.used >= ev.quota);
      const quota = ev.quota ? ` • ${ev.used}/${ev.quota}` : "";
      return `<option value="${SPARI.esc(ev.id)}" ${closed ? "disabled" : ""}>${ev.no}. ${SPARI.esc(ev.name)}${closed ? " — DITUTUP" : quota}</option>`;
    }).join("");

  if (EVENTS.some(ev => ev.id === currentValue && ev.status === "OPEN")) $("eventId").value = currentValue;
  $("eventId").removeAttribute("aria-busy");
  $("eventId").disabled = !isOpen || !EVENTS.length;
  $("submitBtn").disabled = !isOpen || !EVENTS.length;
  $("submitBtn").querySelector(".btn-label").textContent = isOpen ? "KIRIM REGISTRASI" : "PENDAFTARAN DITUTUP";

  renderEventShowcase();
}

function renderEventShowcase() {
  const wrap = $("eventShowcase");
  if (!wrap) return;
  if (!EVENTS.length) {
    wrap.innerHTML = '<div class="showcase-error">Belum ada cabang lomba yang tersedia.</div>';
    return;
  }

  wrap.innerHTML = EVENTS.map(ev => {
    const meta = EVENT_META[ev.id] || {date:"TBA",time:"JADWAL MENYUSUL",place:"LOKASI MENYUSUL",badge:ev.type === "team" ? "TEAM" : "PERSONAL"};
    const full = ev.quota > 0 && Number(ev.used || 0) >= Number(ev.quota || 0);
    const closed = ev.status !== "OPEN" || full;
    const fee = ev.fee ? rupiah(ev.fee) : "GRATIS";
    const quota = ev.quota ? `${ev.used}/${ev.quota} ENTRY` : "OPEN ENTRY";
    return `<button class="competition-card ${closed ? "is-closed" : ""}" type="button" data-event-id="${SPARI.esc(ev.id)}" ${closed ? "disabled" : ""}>
      <span class="comp-no">${String(ev.no).padStart(2,"0")}</span>
      <span class="comp-badge">${SPARI.esc(meta.badge)}</span>
      <strong>${SPARI.esc(ev.name)}</strong>
      <div class="comp-meta"><span>${SPARI.esc(meta.date)}</span><span>${SPARI.esc(meta.time)}</span><span>${SPARI.esc(meta.place)}</span></div>
      <div class="comp-foot"><span>${fee} · ${quota}</span><b>${closed ? "DITUTUP" : "PILIH ↗"}</b></div>
    </button>`;
  }).join("");
}

$("eventShowcase").addEventListener("click", e => {
  const card = e.target.closest("[data-event-id]");
  if (!card || card.disabled) return;
  const id = card.dataset.eventId;
  $("eventId").value = id;
  updateEventUI();
  document.querySelector("#daftar")?.scrollIntoView({behavior:"smooth", block:"start"});
  setTimeout(() => $("aeonId")?.focus({preventScroll:true}), 650);
});

$("phone").addEventListener("input", e => e.target.value = e.target.value.replace(/[^\d+]/g,""));
$("aeonId").addEventListener("input", e => e.target.value = e.target.value.replace(/\s/g,""));
$("eventId").addEventListener("change", updateEventUI);

function updateEventUI() {
  selectedEvent = EVENTS.find(x => x.id === $("eventId").value) || null;
  if (!selectedEvent) {
    $("eventInfo").classList.remove("show");
    $("paymentBox").classList.remove("show");
    return;
  }

  const ev = selectedEvent;
  const meta = EVENT_META[ev.id];
  $("eventMetaLabel").textContent = meta ? `${meta.date} · ${meta.place}` : "SELECTED EVENT";
  $("eventName").textContent = `${String(ev.no).padStart(2,"0")} · ${ev.name}`;
  $("eventFee").textContent = ev.fee ? rupiah(ev.fee) : "GRATIS";

  const baseNote = ev.note || (ev.type === "team" ? "Lomba tim." : "Lomba personal.");
  $("eventDesc").textContent = ev.type === "team"
    ? `${baseNote} Registrasi cukup oleh 1 perwakilan / PIC tim.`
    : baseNote;
  $("eventInfo").classList.add("show");

  if (ev.fee > 0) {
    const cfg = PUBLIC?.settings || {};
    $("paymentText").textContent = `Biaya ${rupiah(ev.fee)} · ${cfg.bank || "CIMB"} ${cfg.accountNumber || ""} a.n ${cfg.accountName || ""}. Verifikasi pembayaran dilakukan panitia.`;
    $("paymentBox").classList.add("show");
  } else {
    $("paymentBox").classList.remove("show");
  }
}

async function renderSuccessQr(url) {
  const target = $("successQr");
  target.innerHTML = '<span class="qr-loading">Menyiapkan QR…</span>';
  try {
    await loadScript(QR_SRC, "qrcodejs");
    target.innerHTML = "";
    new QRCode(target, {text:url, width:145, height:145, correctLevel:QRCode.CorrectLevel.M});
  } catch {
    target.innerHTML = '<span class="qr-loading">QR gagal dimuat.<br>Simpan kode registrasi di atas.</span>';
  }
}

const regForm = $("regForm");
const paymentReminderModal = $("paymentReminderModal");
let pendingRegistration = false;

function openPaymentReminder() {
  const settings = PUBLIC?.settings || {};
  const reminder = String(settings.announcement || "").trim() || "Jika sudah melakukan pembayaran, kirim bukti pembayaran ke Bapak Faiz.";
  $("paymentReminderText").textContent = reminder;
  $("paymentReminderEvent").textContent = selectedEvent ? `${selectedEvent.no}. ${selectedEvent.name} · ${rupiah(selectedEvent.fee)}` : "";

  const message = encodeURIComponent(`Halo Pak Faiz, saya ingin mengirim bukti pembayaran untuk ${selectedEvent?.name || "lomba SPARI HUT RI 81"}.`);
  $("paymentWaLink").href = `https://wa.me/${PAYMENT_WA}?text=${message}`;

  paymentReminderModal.classList.add("show");
  paymentReminderModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  setTimeout(() => $("confirmPaymentReminder")?.focus(), 0);
}

function closePaymentReminder() {
  paymentReminderModal.classList.remove("show");
  paymentReminderModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

async function sendRegistration() {
  if (pendingRegistration) return;
  pendingRegistration = true;
  const btn = $("submitBtn");
  btn.disabled = true;
  btn.classList.add("loading");

  try {
    const registeredEventId = selectedEvent.id;
    const result = await api({
      action:"register",
      aeonId:$("aeonId").value.trim(),
      name:$("name").value.trim(),
      division:$("division").value.trim(),
      phone:$("phone").value.trim(),
      eventId:selectedEvent.id
    }, {timeout:25000});

    latestCode = result.code;
    const statusUrl = new URL("./status.html", location.href);
    statusUrl.searchParams.set("code", latestCode);

    $("successCode").textContent = latestCode;
    $("successInfo").textContent = result.paymentStatus === "Gratis" ? "Lomba ini gratis." : `Status pembayaran: ${result.paymentStatus}.`;
    $("successModal").classList.add("show");
    renderSuccessQr(statusUrl.href);

    const usedEvent = EVENTS.find(x => x.id === registeredEventId);
    if (usedEvent) usedEvent.used = Number(usedEvent.used || 0) + 1;
    if (PUBLIC) writeCachedPublic(PUBLIC);

    regForm.reset();
    selectedEvent = null;
    updateEventUI();
    renderPublicConfig();
  } catch (err) {
    toast(err.message, "error", 4500);
  } finally {
    pendingRegistration = false;
    btn.classList.remove("loading");
    btn.disabled = !PUBLIC?.settings?.registrationOpen || !EVENTS.length;
  }
}

regForm.addEventListener("submit", async e => {
  e.preventDefault();
  if (!PUBLIC?.settings?.registrationOpen) return toast("Pendaftaran sedang ditutup.", "error");
  if (!regForm.reportValidity()) return;
  if (!selectedEvent) return toast("Pilih cabang lomba.", "error");
  if (Number(selectedEvent.fee || 0) > 0) return openPaymentReminder();
  await sendRegistration();
});

$("confirmPaymentReminder").onclick = async () => { closePaymentReminder(); await sendRegistration(); };
$("cancelPaymentReminder").onclick = closePaymentReminder;
$("closePaymentReminder").onclick = closePaymentReminder;
paymentReminderModal.addEventListener("click", e => { if (e.target === paymentReminderModal) closePaymentReminder(); });

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && paymentReminderModal.classList.contains("show")) closePaymentReminder();
});

$("copyCode").onclick = async () => {
  try { await navigator.clipboard.writeText(latestCode); toast("Kode registrasi disalin.", "success"); }
  catch { toast("Silakan salin kode secara manual."); }
};

$("openCard").onclick = () => {
  const url = new URL("./status.html", location.href);
  url.searchParams.set("code", latestCode);
  location.href = url.href;
};

$("successModal").addEventListener("click", e => {
  if (e.target === $("successModal")) $("successModal").classList.remove("show");
});

const observer = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, {threshold:0.12}) : null;

document.querySelectorAll(".section-pad,.register-zone").forEach(el => {
  el.classList.add("reveal-section");
  if (observer) observer.observe(el); else el.classList.add("is-visible");
});

boot();
