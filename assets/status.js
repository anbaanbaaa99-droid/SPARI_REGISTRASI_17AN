const { $, api, rupiah, toast, parseCode, statusClass, checkClass, registerSW } = SPARI;
let currentCode = "";
registerSW();

async function lookup(codeValue) {
  const code = parseCode(codeValue);
  if (!code) {
    toast("Masukkan kode registrasi.", "error");
    return;
  }
  $("lookupBtn").disabled = true;
  try {
    const result = await api({action:"publicStatus", code});
    renderTicket(result.data);
    const url = new URL(location.href);
    url.searchParams.set("code", code);
    history.replaceState({}, "", url);
  } catch (err) {
    $("ticket").classList.remove("show");
    toast(err.message, "error");
  } finally {
    $("lookupBtn").disabled = false;
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
  $("ticketQr").innerHTML = "";
  new QRCode($("ticketQr"), {text:canonical.href, width:155, height:155, correctLevel:QRCode.CorrectLevel.M});

  $("ticket").classList.add("show");
}

$("lookupBtn").onclick = () => lookup($("codeInput").value);
$("codeInput").addEventListener("keydown", e => {
  if (e.key === "Enter") lookup($("codeInput").value);
});
$("copyTicketCode").onclick = async () => {
  try { await navigator.clipboard.writeText(currentCode); toast("Kode disalin.", "success"); }
  catch { toast("Silakan salin kode manual."); }
};

const q = new URLSearchParams(location.search).get("code");
if (q) {
  $("codeInput").value = q;
  lookup(q);
}
