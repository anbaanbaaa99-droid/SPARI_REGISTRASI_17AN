const { $, api, rupiah, esc, toast, statusClass, checkClass, loadScript } = SPARI;
let TOKEN = sessionStorage.getItem("spari_token") || "";
let DATA = [], FILTERED = [], EVENTS = [], SETTINGS = {}, LOGS = [], CHECKINS = [];
let eventChart = null, paymentChart = null;
let chartLoading = false;
const CHART_SRC = "https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js";

const pageTitles = {
  dashboard:"Dashboard Panitia",
  registrations:"Data Registrasi",
  events:"Pengaturan Lomba",
  checkins:"Check-in Peserta",
  settings:"Pengaturan Sistem"
};

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.onclick = () => switchTab(btn.dataset.tab);
});

function switchTab(tab) {
  document.querySelectorAll(".nav-btn").forEach(x => x.classList.toggle("active", x.dataset.tab === tab));
  document.querySelectorAll(".admin-section").forEach(x => x.classList.toggle("active", x.id === `tab-${tab}`));
  $("pageTitle").textContent = pageTitles[tab] || "Dashboard Panitia";
  if (tab === "dashboard") renderCharts();
}

async function adminApi(action, extra={}) {
  return api({action, token:TOKEN, ...extra});
}

$("loginForm").onsubmit = async (e) => {
  e.preventDefault();
  $("loginError").textContent = "";
  $("loginBtn").disabled = true;
  try {
    const result = await api({action:"adminLogin", pin:$("adminPin").value.trim()});
    TOKEN = result.token;
    sessionStorage.setItem("spari_token", TOKEN);
    $("loginOverlay").classList.add("hidden");
    await loadAll();
  } catch (err) {
    $("loginError").textContent = err.message;
  } finally {
    $("loginBtn").disabled = false;
  }
};

async function autoLogin() {
  if (!TOKEN) return;
  try {
    await adminApi("adminPing");
    $("loginOverlay").classList.add("hidden");
    await loadAll();
  } catch {
    sessionStorage.removeItem("spari_token");
    TOKEN = "";
  }
}

async function loadAll() {
  const refresh = $("refreshBtn");
  if (refresh) refresh.disabled = true;
  try {
    const result = await adminApi("adminSnapshot");
    DATA = result.registrations || [];
    EVENTS = result.events || [];
    SETTINGS = result.settings || {};
    LOGS = result.logs || [];
    CHECKINS = result.checkins || [];
    renderAll();
    $("lastUpdate").textContent = "Terakhir diperbarui " + new Date().toLocaleString("id-ID");
  } catch (err) {
    toast(err.message, "error", 4500);
    if (/sesi|token|login/i.test(err.message)) logout();
  } finally {
    if (refresh) refresh.disabled = false;
  }
}

function renderAll() {
  fillFilters();
  applyFilters();
  renderStats();
  renderEvents();
  renderSettings();
  renderLogs();
  renderCheckins();
  renderCharts();
}

function membersOf(x) { return Array.isArray(x.members) ? x.members : []; }

function renderStats() {
  const people = DATA.length;
  const paid = DATA.filter(x => x.paymentStatus === "Sudah Bayar");
  $("sPeople").textContent = people;
  $("sRegs").textContent = DATA.length;
  $("sPaid").textContent = paid.length;
  $("sUnpaid").textContent = DATA.filter(x => x.paymentStatus === "Belum Bayar").length;
  $("sPresent").textContent = DATA.filter(x => x.checkInStatus === "Hadir").length;
  $("sRevenue").textContent = rupiah(paid.reduce((n,x) => n + Number(x.fee || 0), 0));
}

function fillFilters() {
  const cur = $("eventFilter").value;
  $("eventFilter").innerHTML = '<option value="">Semua lomba</option>' +
    EVENTS.map(e => `<option value="${esc(e.id)}">${e.no}. ${esc(e.name)}</option>`).join("");
  if (EVENTS.some(e => e.id === cur)) $("eventFilter").value = cur;
}

function applyFilters() {
  const q = $("search").value.toLowerCase().trim();
  const ev = $("eventFilter").value;
  const st = $("statusFilter").value;
  const ck = $("checkFilter").value;

  FILTERED = DATA.filter(x => {
    const hay = [x.code,x.aeonId,x.name,x.division,x.phone,x.eventName,x.teamName].join(" ").toLowerCase();
    return (!q || hay.includes(q)) &&
      (!ev || x.eventId === ev) &&
      (!st || x.paymentStatus === st) &&
      (!ck || (ck === "Hadir" ? x.checkInStatus === "Hadir" : x.checkInStatus !== "Hadir"));
  });
  renderRegistrations();
}

function renderRegistrations() {
  $("regEmpty").style.display = FILTERED.length ? "none" : "block";
  $("rowInfo").textContent = `${FILTERED.length} dari ${DATA.length} registrasi`;

  $("regBody").innerHTML = FILTERED.map(x => {
    const payBtn = Number(x.fee) > 0
      ? (x.paymentStatus === "Sudah Bayar"
        ? `<button class="mini-btn" data-action="pay" data-code="${esc(x.code)}" data-status="Belum Bayar">Batalkan</button>`
        : `<button class="mini-btn good" data-action="pay" data-code="${esc(x.code)}" data-status="Sudah Bayar">Verifikasi</button>`)
      : "";

    return `<tr>
      <td data-label="Kode"><span class="mono">${esc(x.code)}</span></td>
      <td data-label="Peserta"><div class="person"><b>${esc(x.name)}</b><small>${esc(x.aeonId)} • ${esc(x.division)}</small></div></td>
      <td data-label="Lomba">${x.eventNo}. ${esc(x.eventName)}</td>
      <td data-label="Tim">${esc(x.teamName || "—")}</td>
      <td data-label="Biaya">${x.fee ? rupiah(x.fee) : "Gratis"}</td>
      <td data-label="Bayar"><span class="badge ${statusClass(x.paymentStatus)}">${esc(x.paymentStatus)}</span></td>
      <td data-label="Check-in"><span class="badge ${checkClass(x.checkInStatus)}">${esc(x.checkInStatus || "Belum Hadir")}</span></td>
      <td data-label="Waktu">${esc(x.timestamp)}</td>
      <td data-label="Aksi"><div class="row-actions">
        <button class="mini-btn" data-action="detail" data-code="${esc(x.code)}">Detail</button>
        ${payBtn}
        <button class="mini-btn bad" data-action="delete" data-code="${esc(x.code)}">Hapus</button>
      </div></td>
    </tr>`;
  }).join("");
}

$("regBody").onclick = async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const action = btn.dataset.action, code = btn.dataset.code;

  if (action === "detail") return showDetail(code);

  btn.disabled = true;
  try {
    if (action === "pay") {
      const nextStatus = btn.dataset.status;
      await adminApi("updatePayment",{code,status:nextStatus});
      const row = DATA.find(x => x.code === code);
      if (row) {
        row.paymentStatus = nextStatus;
        row.paymentUpdatedAt = new Date().toLocaleString("id-ID");
      }
      renderAll();
      toast("Status pembayaran diperbarui.", "success");
    } else if (action === "delete") {
      const row = DATA.find(x => x.code === code);
      if (!confirm(`Hapus registrasi ${row?.name || code}? Data tidak dapat dipulihkan.`)) return;
      await adminApi("deleteRegistration",{code});
      DATA = DATA.filter(x => x.code !== code);
      renderAll();
      toast("Registrasi dihapus.", "success");
    }
  } catch (err) {
    toast(err.message,"error");
  } finally {
    btn.disabled = false;
  }
};

function showDetail(code) {
  const x = DATA.find(r => r.code === code);
  if (!x) return;
  $("detailTitle").textContent = x.name;
  $("detailSub").textContent = `${x.code} • ${x.eventNo}. ${x.eventName}`;

  const details = [
    ["ID AEON",x.aeonId],["Divisi",x.division],["WhatsApp",x.phone],["Nama Tim",x.teamName||"—"],
    ["Biaya",x.fee?rupiah(x.fee):"Gratis"],["Pembayaran",x.paymentStatus],["Check-in",x.checkInStatus||"Belum Hadir"],
    ["Terdaftar",x.timestamp],["Update Bayar",x.paymentUpdatedAt||"—"],["Waktu Check-in",x.checkInTime||"—"]
  ];

  $("detailContent").innerHTML = `<div class="detail-grid">${
    details.map(d => `<div class="detail-box"><span>${esc(d[0])}</span><b>${esc(d[1])}</b></div>`).join("")
  }</div>` + (membersOf(x).length ? `<div class="member-list"><b style="font-size:10px">Anggota tambahan (${membersOf(x).length})</b>${
    membersOf(x).map((m,i) => `<div class="member-item">${i+2}. <b>${esc(m.name)}</b> • ID ${esc(m.id)} • ${esc(m.division)}</div>`).join("")
  }</div>` : "");
  $("detailModal").classList.add("show");
}

$("closeDetail").onclick = () => $("detailModal").classList.remove("show");
$("detailModal").onclick = e => { if (e.target === $("detailModal")) $("detailModal").classList.remove("show"); };

function renderEvents() {
  $("eventBody").innerHTML = EVENTS.map(ev => `<tr data-id="${esc(ev.id)}">
    <td data-label="No">${ev.no}</td><td data-label="Cabang"><b>${esc(ev.name)}</b><div style="color:#738197;margin-top:3px">${esc(ev.note||"")}</div></td>
    <td data-label="Tipe">${esc(ev.type)}</td>
    <td data-label="Biaya"><input type="number" class="ev-fee" min="0" value="${Number(ev.fee)||0}"></td>
    <td data-label="Kuota"><input type="number" class="ev-quota" min="0" value="${Number(ev.quota)||0}" title="0 = tanpa batas"></td>
    <td data-label="Terpakai">${ev.used}</td>
    <td data-label="Status"><select class="ev-status"><option value="OPEN" ${ev.status==="OPEN"?"selected":""}>OPEN</option><option value="CLOSED" ${ev.status==="CLOSED"?"selected":""}>CLOSED</option></select></td>
    <td data-label="Aksi"><button class="mini-btn good save-event">Simpan</button></td>
  </tr>`).join("");

  document.querySelectorAll(".save-event").forEach(btn => btn.onclick = async () => {
    const tr = btn.closest("tr"), id = tr.dataset.id;
    btn.disabled = true;
    try {
      await adminApi("updateEvent",{
        eventId:id,
        fee:Number(tr.querySelector(".ev-fee").value)||0,
        quota:Number(tr.querySelector(".ev-quota").value)||0,
        status:tr.querySelector(".ev-status").value
      });
      const ev = EVENTS.find(x => x.id === id);
      if (ev) {
        ev.fee = Number(tr.querySelector(".ev-fee").value) || 0;
        ev.quota = Number(tr.querySelector(".ev-quota").value) || 0;
        ev.status = tr.querySelector(".ev-status").value;
      }
      renderStats();
      renderCharts();
      toast("Pengaturan lomba disimpan.","success");
    } catch (err) { toast(err.message,"error"); }
    finally { btn.disabled = false; }
  });
}

function renderSettings() {
  $("setOpen").value = SETTINGS.registrationOpen ? "TRUE" : "FALSE";
  $("setBank").value = SETTINGS.bank || "";
  $("setAccount").value = SETTINGS.accountNumber || "";
  $("setAccountName").value = SETTINGS.accountName || "";
  $("setAnnouncement").value = SETTINGS.announcement || "";
}

$("settingsForm").onsubmit = async (e) => {
  e.preventDefault();
  try {
    await adminApi("updateSettings",{
      registrationOpen:$("setOpen").value === "TRUE",
      bank:$("setBank").value.trim(),
      accountNumber:$("setAccount").value.trim(),
      accountName:$("setAccountName").value.trim(),
      announcement:$("setAnnouncement").value.trim()
    });
    SETTINGS = {
      ...SETTINGS,
      registrationOpen:$("setOpen").value === "TRUE",
      bank:$("setBank").value.trim(),
      accountNumber:$("setAccount").value.trim(),
      accountName:$("setAccountName").value.trim(),
      announcement:$("setAnnouncement").value.trim()
    };
    toast("Pengaturan publik disimpan.","success");
  } catch (err) { toast(err.message,"error"); }
};

function renderLogs() {
  $("auditList").innerHTML = LOGS.length ? LOGS.map(x =>
    `<div class="audit-item"><b>${esc(x.action)}</b> <span>• ${esc(x.time)}</span><div style="margin-top:3px;color:#9ba8b9">${esc(x.detail||"")}</div></div>`
  ).join("") : '<div class="audit-item"><span>Belum ada audit log.</span></div>';
}

function renderCheckins() {
  $("checkinList").innerHTML = CHECKINS.length ? CHECKINS.map(x =>
    `<div class="recent-item"><div><b>${esc(x.name)}</b><span>${esc(x.eventName)} • ${esc(x.code)}</span></div><span>${esc(x.time)}</span></div>`
  ).join("") : '<div class="recent-item"><span>Belum ada check-in.</span></div>';
}

async function renderCharts() {
  if (!DATA.length) {
    eventChart?.destroy();
    paymentChart?.destroy();
    eventChart = paymentChart = null;
    return;
  }

  if (!window.Chart) {
    if (chartLoading) return;
    chartLoading = true;
    try {
      await loadScript(CHART_SRC, "chartjs");
    } catch (err) {
      toast("Grafik tidak dapat dimuat. Data tabel tetap tersedia.", "error");
      return;
    } finally {
      chartLoading = false;
    }
  }

  const countByEvent = DATA.reduce((out, row) => {
    out[row.eventId] = (out[row.eventId] || 0) + 1;
    return out;
  }, {});
  const pay = DATA.reduce((out, row) => {
    out[row.paymentStatus] = (out[row.paymentStatus] || 0) + 1;
    return out;
  }, {});

  const labels = EVENTS.map(x => `${x.no}. ${x.name}`);
  const counts = EVENTS.map(ev => countByEvent[ev.id] || 0);
  const paymentCounts = [pay["Sudah Bayar"] || 0, pay["Belum Bayar"] || 0, pay["Gratis"] || 0];

  eventChart?.destroy();
  paymentChart?.destroy();

  eventChart = new Chart($("eventChart"), {
    type:"bar",
    data:{labels,datasets:[{label:"Registrasi",data:counts}]},
    options:{responsive:true,maintainAspectRatio:false,animation:{duration:250},plugins:{legend:{display:false}},scales:{
      x:{ticks:{color:"#8a98ab",maxRotation:70,minRotation:45,font:{size:8}},grid:{display:false}},
      y:{beginAtZero:true,ticks:{color:"#8a98ab",precision:0},grid:{color:"rgba(148,163,184,.10)"}}
    }}
  });

  paymentChart = new Chart($("paymentChart"), {
    type:"doughnut",
    data:{labels:["Sudah Bayar","Belum Bayar","Gratis"],datasets:[{data:paymentCounts}]},
    options:{responsive:true,maintainAspectRatio:false,animation:{duration:250},plugins:{legend:{labels:{color:"#cbd5e1",font:{size:10}}}}}
  });
}
["search","eventFilter","statusFilter","checkFilter"].forEach(id => {
  $(id).addEventListener(id === "search" ? "input":"change", applyFilters);
});

$("refreshBtn").onclick = loadAll;
$("exportBtn").onclick = () => {
  const rows = [["Kode","ID AEON","Nama","Divisi","WhatsApp","No Lomba","Lomba","Tim","Biaya","Status Bayar","Check-in","Waktu"]];
  FILTERED.forEach(x => rows.push([x.code,x.aeonId,x.name,x.division,x.phone,x.eventNo,x.eventName,x.teamName,x.fee,x.paymentStatus,x.checkInStatus,x.timestamp]));
  const csv = "\uFEFF" + rows.map(row => row.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(";")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  a.download = "SPARI_HUT_RI_81_REGISTRASI.csv";
  a.click();
  URL.revokeObjectURL(a.href);
};

async function logout() {
  try { if (TOKEN) await adminApi("adminLogout"); } catch {}
  sessionStorage.removeItem("spari_token");
  TOKEN = "";
  DATA = [];
  $("adminPin").value = "";
  $("loginOverlay").classList.remove("hidden");
}
$("logoutBtn").onclick = logout;

autoLogin();
