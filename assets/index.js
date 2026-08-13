const { $, api, rupiah, toast, registerSW, loadScript } = SPARI;

let PUBLIC = null;
let EVENTS = [];
let selectedEvent = null;
let latestCode = "";

const PUBLIC_CACHE_KEY = "spari_public_config_v4";
const PUBLIC_CACHE_TTL = 2 * 60 * 1000;
const QR_SRC = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";

registerSW();

function readCachedPublic() {
  try {
    const cached = JSON.parse(localStorage.getItem(PUBLIC_CACHE_KEY) || "null");
    if (!cached?.data || !cached?.time) return null;
    if (Date.now() - cached.time > PUBLIC_CACHE_TTL) return null;
    return cached.data;
  } catch {
    return null;
  }
}

function writeCachedPublic(data) {
  try {
    localStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify({time:Date.now(), data}));
  } catch {}
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
      $("eventId").innerHTML = '<option value="">Cabang lomba gagal dimuat</option>';
      $("eventId").disabled = true;
      $("submitBtn").disabled = true;
      toast(err.message, "error", 4500);
    } else {
      toast("Menggunakan data tersimpan. Server belum merespons.", "error");
    }
  } finally {
    setLoadingUI(false);
  }
}

function renderPublicConfig() {
  const settings = PUBLIC?.settings || {};
  const heroEventCount = $("heroEventCount");
  if (heroEventCount) heroEventCount.textContent = `${EVENTS.length} cabang lomba`;

  $("registrationState").textContent = settings.registrationOpen
    ? "Pendaftaran sedang dibuka."
    : "Pendaftaran sedang ditutup oleh panitia.";

  const announcement = $("announcement");
  if (settings.announcement) {
    announcement.textContent = settings.announcement;
    announcement.classList.add("show");
  } else {
    announcement.textContent = "";
    announcement.classList.remove("show");
  }

  const currentValue = $("eventId").value;
  $("eventId").innerHTML = '<option value="">— Pilih lomba —</option>' +
    EVENTS.map(ev => {
      const closed = ev.status !== "OPEN" || (ev.quota > 0 && ev.used >= ev.quota);
      const quota = ev.quota ? ` • ${ev.used}/${ev.quota}` : "";
      const suffix = closed ? " — DITUTUP" : quota;
      return `<option value="${SPARI.esc(ev.id)}" ${closed ? "disabled" : ""}>${ev.no}. ${SPARI.esc(ev.name)}${suffix}</option>`;
    }).join("");

  if (EVENTS.some(ev => ev.id === currentValue && ev.status === "OPEN")) {
    $("eventId").value = currentValue;
  }

  $("eventId").removeAttribute("aria-busy");
  $("eventId").disabled = !settings.registrationOpen || !EVENTS.length;
  $("submitBtn").disabled = !settings.registrationOpen || !EVENTS.length;
  $("submitBtn").querySelector(".btn-label").textContent = settings.registrationOpen
    ? "Kirim Registrasi →"
    : "Pendaftaran Ditutup";
}

$("phone").addEventListener("input", e => e.target.value = e.target.value.replace(/[^\d+]/g,""));
$("aeonId").addEventListener("input", e => e.target.value = e.target.value.replace(/\s/g,""));
$("eventId").addEventListener("change", updateEventUI);
$("addMember").addEventListener("click", addMemberRow);

function memberRows() {
  return [...document.querySelectorAll(".member-row")];
}

function addMemberRow() {
  const ev = selectedEvent;
  if (!ev || ev.type !== "team") return;
  const maxAdditional = Math.max(0, (ev.max || 12) - 1);
  if (!ev.flexible && memberRows().length >= maxAdditional) {
    toast("Jumlah anggota sudah mencapai batas maksimum.");
    return;
  }

  const row = document.createElement("div");
  row.className = "member-row";
  row.innerHTML = `
    <input class="control m-id" autocomplete="off" placeholder="ID AEON" aria-label="ID AEON anggota">
    <input class="control m-name" autocomplete="name" placeholder="Nama anggota" aria-label="Nama anggota">
    <input class="control m-division" autocomplete="organization" placeholder="Divisi" aria-label="Divisi anggota">
    <button type="button" class="remove-member" aria-label="Hapus anggota">×</button>`;
  row.querySelector(".remove-member").onclick = () => row.remove();
  $("members").appendChild(row);
}

function fillMinimumMembers(ev) {
  $("members").innerHTML = "";
  if (ev.flexible) return;
  const additional = Math.max(0, (ev.min || 1) - 1);
  for (let i = 0; i < additional; i++) addMemberRow();
}

function updateEventUI() {
  selectedEvent = EVENTS.find(x => x.id === $("eventId").value) || null;
  if (!selectedEvent) {
    $("eventInfo").classList.remove("show");
    $("teamPanel").classList.remove("show");
    $("paymentBox").classList.remove("show");
    $("members").innerHTML = "";
    $("teamName").required = false;
    return;
  }

  const ev = selectedEvent;
  $("eventName").textContent = `${ev.no}. ${ev.name}`;
  $("eventFee").textContent = ev.fee ? rupiah(ev.fee) : "GRATIS";
  $("eventDesc").textContent = ev.note || (ev.type === "team" ? "Lomba tim." : "Lomba personal.");
  $("eventInfo").classList.add("show");

  if (ev.type === "team") {
    $("teamPanel").classList.add("show");
    $("teamName").required = true;
    $("teamRule").textContent = ev.flexible
      ? "jumlah anggota mengikuti ketentuan panitia"
      : `${ev.min}-${ev.max} orang termasuk pendaftar`;
    fillMinimumMembers(ev);
  } else {
    $("teamPanel").classList.remove("show");
    $("teamName").required = false;
    $("teamName").value = "";
    $("members").innerHTML = "";
  }

  if (ev.fee > 0) {
    const s = PUBLIC?.settings || {};
    $("paymentText").textContent =
      `Biaya ${rupiah(ev.fee)} • ${s.bank || "CIMB"} ${s.accountNumber || ""} a.n ${s.accountName || ""}. Status pembayaran akan diverifikasi panitia.`;
    $("paymentBox").classList.add("show");
  } else {
    $("paymentBox").classList.remove("show");
  }
}

function collectMembers() {
  return memberRows().map(row => ({
    id:row.querySelector(".m-id").value.trim(),
    name:row.querySelector(".m-name").value.trim(),
    division:row.querySelector(".m-division").value.trim()
  })).filter(x => x.id || x.name || x.division);
}

function validateTeam(ev) {
  if (ev.type !== "team") return true;
  const members = collectMembers();

  for (const m of members) {
    if (!m.id || !m.name || !m.division) {
      toast("Lengkapi ID AEON, nama, dan divisi seluruh anggota tim.", "error");
      return false;
    }
  }

  if (!ev.flexible) {
    const total = 1 + members.length;
    if (total < ev.min || total > ev.max) {
      toast(`Jumlah peserta harus ${ev.min}-${ev.max} orang termasuk pendaftar.`, "error");
      return false;
    }
  }
  return true;
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

$("regForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!PUBLIC?.settings?.registrationOpen) {
    toast("Pendaftaran sedang ditutup.", "error");
    return;
  }
  if (!$("regForm").reportValidity()) return;
  if (!selectedEvent) {
    toast("Pilih cabang lomba.", "error");
    return;
  }
  if (!validateTeam(selectedEvent)) return;

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
      eventId:selectedEvent.id,
      teamName:selectedEvent.type === "team" ? $("teamName").value.trim() : "",
      members:selectedEvent.type === "team" ? collectMembers() : []
    }, {timeout:25000});

    latestCode = result.code;
    const statusUrl = new URL("./status.html", location.href);
    statusUrl.searchParams.set("code", latestCode);

    $("successCode").textContent = latestCode;
    $("successInfo").textContent = result.paymentStatus === "Gratis"
      ? "Lomba ini gratis."
      : `Status pembayaran: ${result.paymentStatus}.`;

    $("successModal").classList.add("show");
    renderSuccessQr(statusUrl.href);

    const usedEvent = EVENTS.find(x => x.id === registeredEventId);
    if (usedEvent) usedEvent.used = Number(usedEvent.used || 0) + 1;
    if (PUBLIC) writeCachedPublic(PUBLIC);

    $("regForm").reset();
    selectedEvent = null;
    updateEventUI();
    renderPublicConfig();
  } catch (err) {
    toast(err.message, "error", 4500);
  } finally {
    btn.classList.remove("loading");
    btn.disabled = !PUBLIC?.settings?.registrationOpen || !EVENTS.length;
  }
});

$("copyCode").onclick = async () => {
  try {
    await navigator.clipboard.writeText(latestCode);
    toast("Kode registrasi disalin.", "success");
  } catch {
    toast("Silakan salin kode secara manual.");
  }
};

$("openCard").onclick = () => {
  const url = new URL("./status.html", location.href);
  url.searchParams.set("code", latestCode);
  location.href = url.href;
};

$("successModal").addEventListener("click", e => {
  if (e.target === $("successModal")) $("successModal").classList.remove("show");
});

boot();
