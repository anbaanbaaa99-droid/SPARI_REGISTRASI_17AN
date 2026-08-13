const { $, api, toast, parseCode, loadScript } = SPARI;

let TOKEN = sessionStorage.getItem("spari_token") || "";
let CURRENT = null;
let scanner = null;
let lastScan = "";
let scannerStarting = false;

const SCANNER_SRC = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";

async function adminApi(action, extra={}) {
  return api({action, token:TOKEN, ...extra});
}

$("loginForm").onsubmit = async e => {
  e.preventDefault();
  $("loginError").textContent = "";
  const submit = e.submitter || $("loginForm").querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const result = await api({action:"adminLogin", pin:$("adminPin").value.trim()});
    TOKEN = result.token;
    sessionStorage.setItem("spari_token", TOKEN);
    $("loginOverlay").classList.add("hidden");
    startScanner();
  } catch (err) {
    $("loginError").textContent = err.message;
  } finally {
    submit.disabled = false;
  }
};

async function autoLogin() {
  if (!TOKEN) return;
  try {
    await adminApi("adminPing");
    $("loginOverlay").classList.add("hidden");
    startScanner();
  } catch {
    TOKEN = "";
    sessionStorage.removeItem("spari_token");
  }
}

async function startScanner() {
  if (scanner || scannerStarting) return;
  scannerStarting = true;
  $("reader").innerHTML = '<div class="scanner-loading"><span class="spinner-ring"></span><b>Menyiapkan kamera…</b><small>Komponen scanner dimuat setelah login agar halaman lebih ringan.</small></div>';

  try {
    await loadScript(SCANNER_SRC, "html5-qrcode");
    if (!window.Html5QrcodeScanner) throw new Error("Scanner QR tidak tersedia.");

    $("reader").innerHTML = "";
    scanner = new Html5QrcodeScanner("reader", {
      fps:8,
      qrbox:{width:220,height:220},
      rememberLastUsedCamera:true,
      showTorchButtonIfSupported:true,
      showZoomSliderIfSupported:true
    }, false);

    scanner.render(async decoded => {
      const code = parseCode(decoded);
      if (!code || code === lastScan) return;
      lastScan = code;
      await lookup(code);
      setTimeout(() => { lastScan = ""; }, 1600);
    }, () => {});
  } catch (err) {
    $("reader").innerHTML = '<div class="scanner-loading"><b>Scanner kamera gagal dimuat.</b><small>Gunakan pencarian kode manual di bawah.</small></div>';
    toast(err.message, "error", 4500);
  } finally {
    scannerStarting = false;
  }
}

async function lookup(value) {
  const code = parseCode(value);
  if (!code) return toast("Kode tidak valid.", "error");

  const manualBtn = $("manualLookup");
  manualBtn.disabled = true;
  try {
    const result = await adminApi("adminLookup", {code});
    CURRENT = result.data;
    renderCurrent();
    $("manualCode").value = code;
  } catch (err) {
    CURRENT = null;
    $("lookupResult").classList.remove("show");
    $("lookupEmpty").style.display = "block";
    toast(err.message, "error", 4500);
  } finally {
    manualBtn.disabled = false;
  }
}

function renderCurrent() {
  const x = CURRENT;
  $("ciName").textContent = x.name;
  $("ciSub").textContent = `${x.code} • ${x.eventNo}. ${x.eventName}`;
  $("ciPayment").textContent = x.paymentStatus;
  $("ciStatus").textContent = x.checkInStatus || "Belum Hadir";
  $("ciDivision").textContent = x.division || "-";
  $("ciTeam").textContent = x.teamName || "-";
  $("checkinBtn").disabled = x.checkInStatus === "Hadir";
  $("undoBtn").disabled = x.checkInStatus !== "Hadir";
  $("lookupEmpty").style.display = "none";
  $("lookupResult").classList.add("show");
}

$("manualLookup").onclick = () => lookup($("manualCode").value);
$("manualCode").addEventListener("keydown", e => {
  if (e.key === "Enter") lookup($("manualCode").value);
});

$("checkinBtn").onclick = async () => {
  if (!CURRENT) return;
  const btn = $("checkinBtn");
  btn.disabled = true;
  try {
    const result = await adminApi("setCheckIn", {code:CURRENT.code, present:true});
    CURRENT.checkInStatus = result.status || "Hadir";
    renderCurrent();
    toast("Peserta berhasil check-in.", "success");
  } catch (err) {
    toast(err.message, "error");
    renderCurrent();
  }
};

$("undoBtn").onclick = async () => {
  if (!CURRENT) return;
  if (!confirm("Batalkan status check-in peserta ini?")) return;
  const btn = $("undoBtn");
  btn.disabled = true;
  try {
    const result = await adminApi("setCheckIn", {code:CURRENT.code, present:false});
    CURRENT.checkInStatus = result.status || "Belum Hadir";
    renderCurrent();
    toast("Check-in dibatalkan.", "success");
  } catch (err) {
    toast(err.message, "error");
    renderCurrent();
  }
};

autoLogin();
