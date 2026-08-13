const { $, api, rupiah, toast, parseCode, statusClass, checkClass, registerSW, loadScript } = SPARI;

let currentCode = "";
const QR_SRC = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";

registerSW();

async function lookup(codeValue) {
  const code = parseCode(codeValue);
  if (!code) {
    toast("Masukkan kode registrasi.", "error");
    return;
  }

  const btn = $("lookupBtn");
  btn.disabled = true;
  btn.classList.add("is-loading");
  try {
    const result = await api({action:"publicStatus", code});
    renderTicket(result.data);
    const url = new URL(location.href);
    url.searchParams.set("code", code);
    history.replaceState({}, "", url);
  } catch (err) {
    $("ticket").classList.remove("show");
    toast(err.message, "error", 4500);
  } finally {
    btn.disabled = false;
    btn.classList.remove("is-loading");
  }
}

async function renderTicketQr(url) {
  const target = $("ticketQr");
  target.innerHTML = '<span class="qr-loading">Menyiapkan QR…</span>';
  try {
    await loadScript(QR_SRC, "qrcodejs");
    target.innerHTML = "";
    new QRCode(target, {text:url, width:155, height:155, correctLevel:QRCode.CorrectLevel.M});
  } catch {
    target.innerHTML = '<span class="qr-loading">QR gagal dimuat.<br>Gunakan kode peserta.</span>';
  }
}

function renderTicket(x) {
  currentCode = x.code;
  $("ticketName").textContent = x.name;
  $("ticketEvent").textContent = `${x.eventNo}. ${x.eventName}`;
  $("ticketCode").textContent = x.code;
  $("ticketDivision").textContent = x.division || "-";
  $("ticketTeam").textContent = x.teamName || "-";
  $("ticketFee").textContent = x.fee ? rupiah(x.fee) : "Gratis";
  $("ticketCreated").textContent = x.timestamp || "-";

  $("paymentBadge").textContent = `Pembayaran: ${x.paymentStatus}`;
  $("paymentBadge").className = `badge ${statusClass(x.paymentStatus)}`;

  const check = x.checkInStatus || "Belum Hadir";
  $("checkinBadge").textContent = `Check-in: ${check}`;
  $("checkinBadge").className = `badge ${checkClass(check)}`;

  const canonical = new URL("./status.html", location.href);
  canonical.searchParams.set("code", x.code);

  $("ticket").classList.add("show");
  renderTicketQr(canonical.href);
}

$("lookupBtn").onclick = () => lookup($("codeInput").value);
$("codeInput").addEventListener("keydown", e => {
  if (e.key === "Enter") lookup($("codeInput").value);
});

$("copyTicketCode").onclick = async () => {
  if (!currentCode) return;
  try {
    await navigator.clipboard.writeText(currentCode);
    toast("Kode disalin.", "success");
  } catch {
    toast("Silakan salin kode manual.");
  }
};

const q = new URLSearchParams(location.search).get("code");
if (q) {
  $("codeInput").value = q;
  lookup(q);
}
