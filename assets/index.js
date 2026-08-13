const { $, api, rupiah, toast, registerSW } = SPARI;
let PUBLIC = null;
let EVENTS = [];
let selectedEvent = null;
let latestCode = "";

registerSW();

async function boot() {
  try {
    PUBLIC = await api({action:"publicConfig"});
    EVENTS = PUBLIC.events || [];
    renderPublicConfig();
  } catch (err) {
    $("registrationState").textContent = "Gagal terhubung ke server.";
    toast(err.message, "error");
  }
}

function renderPublicConfig() {
  const settings = PUBLIC.settings || {};
  const heroEventCount = $("heroEventCount");
if (heroEventCount) {
  heroEventCount.textContent = `${EVENTS.length} Cabang`;
}
  $("registrationState").textContent =
    settings.registrationOpen ? "Pendaftaran sedang dibuka." : "Pendaftaran sedang ditutup oleh panitia.";

  if (settings.announcement) {
    $("announcement").textContent = settings.announcement;
    $("announcement").classList.add("show");
  }

  $("eventId").innerHTML = '<option value="">— Pilih lomba —</option>' +
    EVENTS.map(ev => {
      const closed = ev.status !== "OPEN";
      const quota = ev.quota ? ` • Kuota ${ev.used}/${ev.quota}` : "";
      return `<option value="${ev.id}" ${closed ? "disabled":""}>${ev.no}. ${SPARI.esc(ev.name)}${closed ? " — DITUTUP":quota}</option>`;
    }).join("");

  if (!settings.registrationOpen) {
    $("submitBtn").disabled = true;
    $("submitBtn").querySelector(".btn-label").textContent = "Pendaftaran Ditutup";
  }
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
  if (memberRows().length >= maxAdditional) {
    toast("Jumlah anggota sudah mencapai batas maksimum.");
    return;
  }

  const row = document.createElement("div");
  row.className = "member-row";
  row.innerHTML = `
    <input class="control m-id" placeholder="ID AEON">
    <input class="control m-name" placeholder="Nama anggota">
    <input class="control m-division" placeholder="Divisi">
    <button type="button" class="remove-member" aria-label="Hapus anggota">×</button>`;
  row.querySelector(".remove-member").onclick = () => row.remove();
  $("members").appendChild(row);
}

function fillMinimumMembers(ev) {
  $("members").innerHTML = "";
  if (ev.flexible) return;
  const additional = Math.max(0, (ev.min || 1) - 1);
  for (let i=0; i<additional; i++) addMemberRow();
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
    $("teamRule").textContent = ev.flexible ? "jumlah anggota mengikuti ketentuan panitia" : `${ev.min}-${ev.max} orang termasuk pendaftar`;
    fillMinimumMembers(ev);
  } else {
    $("teamPanel").classList.remove("show");
    $("teamName").required = false;
    $("teamName").value = "";
    $("members").innerHTML = "";
  }

  if (ev.fee > 0) {
    const s = PUBLIC.settings || {};
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
    const result = await api({
      action:"register",
      aeonId:$("aeonId").value.trim(),
      name:$("name").value.trim(),
      division:$("division").value.trim(),
      phone:$("phone").value.trim(),
      eventId:selectedEvent.id,
      teamName:selectedEvent.type === "team" ? $("teamName").value.trim() : "",
      members:selectedEvent.type === "team" ? collectMembers() : []
    });

    latestCode = result.code;
    const statusUrl = new URL("./status.html", location.href);
    statusUrl.searchParams.set("code", latestCode);

    $("successCode").textContent = latestCode;
    $("successInfo").textContent = result.paymentStatus === "Gratis"
      ? "Lomba ini gratis."
      : `Status pembayaran: ${result.paymentStatus}.`;

    $("successQr").innerHTML = "";
    new QRCode($("successQr"), {text:statusUrl.href, width:145, height:145, correctLevel:QRCode.CorrectLevel.M});

    $("successModal").classList.add("show");
    $("regForm").reset();
    selectedEvent = null;
    updateEventUI();
    await boot();
  } catch (err) {
    toast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
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

boot();
