const { $, api, toast, parseCode } = SPARI;
let TOKEN = sessionStorage.getItem("spari_token") || "";
let CURRENT = null;
let scanner = null;
let lastScan = "";

async function adminApi(action, extra={}) {
  return api({action, token:TOKEN, ...extra});
}

$("loginForm").onsubmit = async e => {
  e.preventDefault();
  $("loginError").textContent = "";
  try {
    const result = await api({action:"adminLogin",pin:$("adminPin").value.trim()});
    TOKEN = result.token;
    sessionStorage.setItem("spari_token",TOKEN);
    $("loginOverlay").classList.add("hidden");
    startScanner();
  } catch (err) { $("loginError").textContent = err.message; }
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

function startScanner() {
  if (!window.Html5QrcodeScanner || scanner) return;
  scanner = new Html5QrcodeScanner("reader",{fps:10,qrbox:{width:230,height:230},rememberLastUsedCamera:true},false);
  scanner.render(async decoded => {
    const code = parseCode(decoded);
    if (!code || code === lastScan) return;
    lastScan = code;
    await lookup(code);
    setTimeout(()=>{lastScan="";},1800);
  }, () => {});
}

async function lookup(value) {
  const code = parseCode(value);
  if (!code) return toast("Kode tidak valid.","error");
  try {
    const result = await adminApi("adminLookup",{code});
    CURRENT = result.data;
    renderCurrent();
  } catch (err) {
    CURRENT = null;
    $("lookupResult").classList.remove("show");
    $("lookupEmpty").style.display = "block";
    toast(err.message,"error");
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
$("manualCode").addEventListener("keydown", e => { if(e.key==="Enter") lookup($("manualCode").value); });

$("checkinBtn").onclick = async () => {
  if (!CURRENT) return;
  try {
    const result = await adminApi("setCheckIn",{code:CURRENT.code,present:true});
    toast("Peserta berhasil check-in.","success");
    await lookup(CURRENT.code);
  } catch (err) { toast(err.message,"error"); }
};

$("undoBtn").onclick = async () => {
  if (!CURRENT) return;
  if (!confirm("Batalkan status check-in peserta ini?")) return;
  try {
    await adminApi("setCheckIn",{code:CURRENT.code,present:false});
    toast("Check-in dibatalkan.","success");
    await lookup(CURRENT.code);
  } catch (err) { toast(err.message,"error"); }
};

autoLogin();
