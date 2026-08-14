const { $, api, rupiah, toast, registerSW, loadScript } = SPARI;

let PUBLIC = null;
let EVENTS = [];
let selectedEvent = null;
let latestCode = "";

const PUBLIC_CACHE_KEY = "spari_public_config_v8_2";
const PUBLIC_CACHE_TTL = 2 * 60 * 1000;
const QR_SRC = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";

/* =========================================================
   FALLBACK JADWAL
   Tetap tampil walaupun site-data.js kena cache / gagal dimuat
========================================================= */

const DEFAULT_AGENDA = [
  {
    date: "16",
    month: "AUG",
    day: "SUN",
    label: "NIGHT MATCH",
    title: "FUTSAL",
    lines: [
      "Lapangan I · 23.00–00.00",
      "Lapangan II · 23.00–01.00"
    ],
    featured: true
  },

  {
    date: "17",
    month: "AUG",
    day: "MON",
    label: "MEETING ROOM",
    title: "PS4 · eFootball",
    lines: [
      "23.00–selesai · 2 set PlayStation 4"
    ]
  },

  {
    date: "20",
    month: "AUG",
    day: "THU",
    label: "COMPETITION DAY",
    title: "NYANYI + BADMINTON",
    lines: [
      "Nyanyi · 15.00",
      "Badminton · 23.00"
    ]
  },

  {
    date: "22",
    month: "AUG",
    day: "SAT",
    label: "NIGHT GAME",
    title: "BASKET 3X3",
    lines: [
      "Start · 23.00"
    ]
  },

  {
    date: "24",
    month: "AUG",
    day: "MON",
    label: "FUN GAMES DAY · JAM & LOKASI MENYUSUL",
    title: "5 CABANG, 1 HARI",
    tags: [
      "Pancingan Kerupuk",
      "Balap Karung + Helm",
      "Pindahkan Air Pakai Kaki",
      "Tarik Tambang",
      "Pindahkan Bola Pakai Stik"
    ],
    wide: true
  }
];

const DEFAULT_EVENT_META = {
  "1": {
    date: "17 AUG",
    time: "23.00–SELESAI",
    place: "MEETING ROOM",
    badge: "2 SET PS4 · EFOOTBALL"
  },

  "2": {
    date: "16 AUG",
    time: "23.00–01.00",
    place: "LAPANGAN I & II",
    badge: "NIGHT MATCH"
  },

  "3": {
    date: "22 AUG",
    time: "23.00",
    place: "MENYUSUL",
    badge: "BASKET 3X3"
  },

  "4": {
    date: "20 AUG",
    time: "23.00",
    place: "MENYUSUL",
    badge: "BADMINTON"
  },

  "5": {
    date: "20 AUG",
    time: "15.00",
    place: "MENYUSUL",
    badge: "LOMBA NYANYI"
  },

  "6": {
    date: "24 AUG",
    time: "MENYUSUL",
    place: "MENYUSUL",
    badge: "FUN GAMES DAY"
  },

  "7": {
    date: "24 AUG",
    time: "MENYUSUL",
    place: "MENYUSUL",
    badge: "FUN GAMES DAY"
  },

  "8": {
    date: "24 AUG",
    time: "MENYUSUL",
    place: "MENYUSUL",
    badge: "FUN GAMES DAY"
  },

  "9": {
    date: "24 AUG",
    time: "MENYUSUL",
    place: "MENYUSUL",
    badge: "FUN GAMES DAY"
  },

  "10": {
    date: "24 AUG",
    time: "MENYUSUL",
    place: "MENYUSUL",
    badge: "FUN GAMES DAY"
  }
};

registerSW();

/* =========================================================
   SITE DATA
========================================================= */

function getSiteData() {
  return window.SPARI_SITE_DATA || {};
}

function getAgenda() {
  const agenda = getSiteData().agenda;

  return Array.isArray(agenda) && agenda.length
    ? agenda
    : DEFAULT_AGENDA;
}

function getEventMeta(eventId, eventType = "personal") {
  const id = String(eventId ?? "");

  const custom = getSiteData().eventMeta?.[id];

  if (custom) return custom;

  if (DEFAULT_EVENT_META[id]) {
    return DEFAULT_EVENT_META[id];
  }

  return {
    date: "TBA",
    time: "JADWAL MENYUSUL",
    place: "LOKASI MENYUSUL",
    badge: eventType === "team" ? "TEAM" : "PERSONAL"
  };
}

function getPaymentWhatsapp() {
  return getSiteData().paymentWhatsapp || "6285813035634";
}

/* Paksa mengambil site-data.js terbaru */
async function refreshSiteData() {
  try {
    const stamp = Date.now();

    await loadScript(
      `./assets/site-data.js?v=${stamp}`,
      `spari-site-data-${stamp}`
    );

    return true;

  } catch (err) {

    console.warn(
      "site-data.js terbaru gagal dimuat. Menggunakan fallback.",
      err
    );

    return false;
  }
}

/* =========================================================
   AGENDA
========================================================= */

function renderAgenda() {

  const wrap = $("agendaTimeline");

  if (!wrap) return;

  const agenda = getAgenda();

  if (!agenda.length) {

    wrap.innerHTML =
      '<div class="agenda-loading">Jadwal terbaru akan diumumkan panitia.</div>';

    return;
  }

  wrap.innerHTML = agenda.map(item => {

    const lines =
      Array.isArray(item.lines)
        ? item.lines
            .map(line => SPARI.esc(line))
            .join("<br>")
        : "";

    const tags =
      Array.isArray(item.tags) && item.tags.length
        ? `
          <div class="timeline-tags">
            ${item.tags
              .map(tag => `<span>${SPARI.esc(tag)}</span>`)
              .join("")}
          </div>
        `
        : "";

    return `
      <article
        class="
          timeline-card
          ${item.featured ? "featured" : ""}
          ${item.wide ? "wide" : ""}
        "
      >

        <div class="timeline-date">

          <b>
            ${SPARI.esc(item.date || "--")}
          </b>

          <span>
            ${SPARI.esc(item.month || "")}
            <br>
            ${SPARI.esc(item.day || "")}
          </span>

        </div>

        <div class="timeline-main">

          <div class="timeline-label">
            ${SPARI.esc(item.label || "")}
          </div>

          <h3>
            ${SPARI.esc(item.title || "")}
          </h3>

          ${lines ? `<p>${lines}</p>` : ""}

          ${tags}

        </div>

        ${
          item.wide
            ? ""
            : '<span class="timeline-arrow">↗</span>'
        }

      </article>
    `;

  }).join("");
}

/* =========================================================
   CACHE PUBLIC CONFIG
========================================================= */

function readCachedPublic() {

  try {

    const cached =
      JSON.parse(
        localStorage.getItem(PUBLIC_CACHE_KEY) || "null"
      );

    if (!cached?.data || !cached?.time) {
      return null;
    }

    if (
      Date.now() - cached.time >
      PUBLIC_CACHE_TTL
    ) {
      return null;
    }

    return cached.data;

  } catch {

    return null;
  }
}

function writeCachedPublic(data) {

  try {

    localStorage.setItem(
      PUBLIC_CACHE_KEY,
      JSON.stringify({
        time: Date.now(),
        data
      })
    );

  } catch {}
}

/* =========================================================
   LOADING
========================================================= */

function setLoadingUI(loading) {

  const eventSelect = $("eventId");
  const submit = $("submitBtn");

  if (eventSelect) {

    eventSelect.disabled =
      loading && !EVENTS.length;
  }

  if (submit && !PUBLIC) {

    submit.disabled = loading;
  }
}

/* =========================================================
   BOOT
========================================================= */

async function boot() {

  /*
    PENTING:
    jadwal dibaca terlebih dahulu
  */

  await refreshSiteData();

  renderAgenda();

  /*
    config cabang lomba
  */

  const cached =
    readCachedPublic();

  if (cached) {

    PUBLIC = cached;

    EVENTS =
      cached.events || [];

    renderPublicConfig();
  }

  setLoadingUI(true);

  try {

    const fresh =
      await api({
        action: "publicConfig"
      });

    PUBLIC = fresh;

    EVENTS =
      fresh.events || [];

    writeCachedPublic(fresh);

    renderPublicConfig();

  } catch (err) {

    if (!PUBLIC) {

      if ($("registrationState")) {

        $("registrationState").textContent =
          "Gagal terhubung ke server.";
      }

      if ($("heroRegState")) {

        $("heroRegState").textContent =
          "Server unavailable";
      }

      if ($("eventId")) {

        $("eventId").innerHTML =
          '<option value="">Cabang lomba gagal dimuat</option>';

        $("eventId").disabled =
          true;
      }

      if ($("submitBtn")) {

        $("submitBtn").disabled =
          true;
      }

      if ($("eventShowcase")) {

        $("eventShowcase").innerHTML =
          `
            <div class="showcase-error">
              Daftar cabang belum bisa dimuat.
              Coba refresh beberapa saat lagi.
            </div>
          `;
      }

      toast(
        err.message,
        "error",
        4500
      );

    } else {

      toast(
        "Menggunakan data tersimpan. Server belum merespons.",
        "error"
      );
    }

  } finally {

    setLoadingUI(false);
  }
}

/* =========================================================
   PUBLIC CONFIG
========================================================= */

function renderPublicConfig() {

  const settings =
    PUBLIC?.settings || {};

  const isOpen =
    !!settings.registrationOpen;

  if ($("registrationState")) {

    $("registrationState").textContent =
      isOpen
        ? "Pendaftaran sedang dibuka."
        : "Pendaftaran sedang ditutup oleh panitia.";
  }

  if ($("heroRegState")) {

    $("heroRegState").textContent =
      isOpen
        ? "Open now"
        : "Closed";
  }

  const eventSelect =
    $("eventId");

  if (eventSelect) {

    const currentValue =
      eventSelect.value;

    eventSelect.innerHTML =
      '<option value="">— Pilih lomba —</option>' +

      EVENTS.map(ev => {

        const closed =
          ev.status !== "OPEN" ||

          (
            Number(ev.quota || 0) > 0 &&

            Number(ev.used || 0) >=
            Number(ev.quota || 0)
          );

        const quota =
          Number(ev.quota || 0) > 0
            ? ` • ${ev.used}/${ev.quota}`
            : "";

        return `
          <option
            value="${SPARI.esc(ev.id)}"
            ${closed ? "disabled" : ""}
          >
            ${ev.no}. ${SPARI.esc(ev.name)}
            ${closed ? " — DITUTUP" : quota}
          </option>
        `;

      }).join("");

    if (
      EVENTS.some(
        ev =>
          ev.id === currentValue &&
          ev.status === "OPEN"
      )
    ) {

      eventSelect.value =
        currentValue;
    }

    eventSelect.removeAttribute(
      "aria-busy"
    );

    eventSelect.disabled =
      !isOpen ||
      !EVENTS.length;
  }

  const submitBtn =
    $("submitBtn");

  if (submitBtn) {

    submitBtn.disabled =
      !isOpen ||
      !EVENTS.length;

    const label =
      submitBtn.querySelector(
        ".btn-label"
      );

    if (label) {

      label.textContent =
        isOpen
          ? "KIRIM REGISTRASI"
          : "PENDAFTARAN DITUTUP";
    }
  }

  renderEventShowcase();
}

/* =========================================================
   COMPETITION CARDS
========================================================= */

function renderEventShowcase() {

  const wrap =
    $("eventShowcase");

  if (!wrap) return;

  if (!EVENTS.length) {

    wrap.innerHTML =
      `
        <div class="showcase-error">
          Belum ada cabang lomba yang tersedia.
        </div>
      `;

    return;
  }

  wrap.innerHTML =
    EVENTS.map(ev => {

      const meta =
        getEventMeta(
          ev.id,
          ev.type
        );

      const full =
        Number(ev.quota || 0) > 0 &&

        Number(ev.used || 0) >=
        Number(ev.quota || 0);

      const closed =
        ev.status !== "OPEN" ||
        full;

      const fee =
        Number(ev.fee || 0) > 0
          ? rupiah(ev.fee)
          : "GRATIS";

      const quota =
        Number(ev.quota || 0) > 0
          ? `${ev.used}/${ev.quota} ENTRY`
          : "OPEN ENTRY";

      return `
        <button
          class="
            competition-card
            ${closed ? "is-closed" : ""}
          "
          type="button"
          data-event-id="${SPARI.esc(ev.id)}"
          ${closed ? "disabled" : ""}
        >

          <span class="comp-no">
            ${String(ev.no).padStart(2, "0")}
          </span>

          <span class="comp-badge">
            ${SPARI.esc(
              meta.badge ||
              (
                ev.type === "team"
                  ? "TEAM"
                  : "PERSONAL"
              )
            )}
          </span>

          <strong>
            ${SPARI.esc(ev.name)}
          </strong>

          <div class="comp-meta">

            <span>
              ${SPARI.esc(
                meta.date || "TBA"
              )}
            </span>

            <span>
              ${SPARI.esc(
                meta.time ||
                "JADWAL MENYUSUL"
              )}
            </span>

            <span>
              ${SPARI.esc(
                meta.place ||
                "LOKASI MENYUSUL"
              )}
            </span>

          </div>

          <div class="comp-foot">

            <span>
              ${fee} · ${quota}
            </span>

            <b>
              ${
                closed
                  ? "DITUTUP"
                  : "PILIH ↗"
              }
            </b>

          </div>

        </button>
      `;

    }).join("");
}

/* =========================================================
   CARD CLICK
========================================================= */

const eventShowcase =
  $("eventShowcase");

if (eventShowcase) {

  eventShowcase.addEventListener(
    "click",
    e => {

      const card =
        e.target.closest(
          "[data-event-id]"
        );

      if (
        !card ||
        card.disabled
      ) return;

      const id =
        card.dataset.eventId;

      if ($("eventId")) {

        $("eventId").value =
          id;
      }

      updateEventUI();

      document
        .querySelector("#daftar")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

      setTimeout(
        () =>
          $("aeonId")
            ?.focus({
              preventScroll: true
            }),
        650
      );
    }
  );
}

/* =========================================================
   INPUT
========================================================= */

if ($("phone")) {

  $("phone").addEventListener(
    "input",
    e => {

      e.target.value =
        e.target.value.replace(
          /[^\d+]/g,
          ""
        );
    }
  );
}

if ($("aeonId")) {

  $("aeonId").addEventListener(
    "input",
    e => {

      e.target.value =
        e.target.value.replace(
          /\s/g,
          ""
        );
    }
  );
}

if ($("eventId")) {

  $("eventId").addEventListener(
    "change",
    updateEventUI
  );
}

/* =========================================================
   EVENT DETAIL
========================================================= */

function updateEventUI() {

  const eventSelect =
    $("eventId");

  selectedEvent =
    EVENTS.find(
      x =>
        x.id ===
        eventSelect?.value
    ) || null;

  if (!selectedEvent) {

    $("eventInfo")
      ?.classList
      .remove("show");

    $("paymentBox")
      ?.classList
      .remove("show");

    return;
  }

  const ev =
    selectedEvent;

  const meta =
    getEventMeta(
      ev.id,
      ev.type
    );

  if ($("eventMetaLabel")) {

    $("eventMetaLabel").textContent =
      `${meta.date || "TBA"} · ${meta.place || "MENYUSUL"}`;
  }

  if ($("eventName")) {

    $("eventName").textContent =
      `${String(ev.no).padStart(2, "0")} · ${ev.name}`;
  }

  if ($("eventFee")) {

    $("eventFee").textContent =
      Number(ev.fee || 0) > 0
        ? rupiah(ev.fee)
        : "GRATIS";
  }

  const baseNote =
    ev.note ||

    (
      ev.type === "team"
        ? "Lomba tim."
        : "Lomba personal."
    );

  if ($("eventDesc")) {

    $("eventDesc").textContent =
      ev.type === "team"

        ? `${baseNote} Registrasi cukup oleh 1 perwakilan / PIC tim.`

        : baseNote;
  }

  $("eventInfo")
    ?.classList
    .add("show");

  if (
    Number(ev.fee || 0) > 0
  ) {

    const cfg =
      PUBLIC?.settings || {};

    if ($("paymentText")) {

      $("paymentText").textContent =

        `Biaya ${rupiah(ev.fee)} · ` +

        `${cfg.bank || "CIMB"} ` +

        `${cfg.accountNumber || ""} ` +

        `a.n ${cfg.accountName || ""}. ` +

        `Verifikasi pembayaran dilakukan panitia.`;
    }

    $("paymentBox")
      ?.classList
      .add("show");

  } else {

    $("paymentBox")
      ?.classList
      .remove("show");
  }
}

/* =========================================================
   SUCCESS QR
========================================================= */

async function renderSuccessQr(url) {

  const target =
    $("successQr");

  if (!target) return;

  target.innerHTML =
    `
      <span class="qr-loading">
        Menyiapkan QR…
      </span>
    `;

  try {

    await loadScript(
      QR_SRC,
      "qrcodejs"
    );

    target.innerHTML =
      "";

    new QRCode(
      target,
      {
        text: url,
        width: 145,
        height: 145,
        correctLevel:
          QRCode.CorrectLevel.M
      }
    );

  } catch {

    target.innerHTML =
      `
        <span class="qr-loading">
          QR gagal dimuat.
          <br>
          Simpan kode registrasi di atas.
        </span>
      `;
  }
}

/* =========================================================
   PAYMENT POPUP
========================================================= */

const regForm =
  $("regForm");

const paymentReminderModal =
  $("paymentReminderModal");

let pendingRegistration =
  false;

let paymentCloseTimer =
  null;

function openPaymentReminder() {

  if (!paymentReminderModal) {
    return;
  }

  const settings =
    PUBLIC?.settings || {};

  const reminder =
    String(
      settings.announcement || ""
    ).trim() ||

    "Jika sudah melakukan pembayaran, kirim bukti pembayaran ke Bapak Faiz.";

  if ($("paymentReminderText")) {

    $("paymentReminderText").textContent =
      reminder;
  }

  if ($("paymentReminderEvent")) {

    $("paymentReminderEvent").textContent =
      selectedEvent

        ? `${selectedEvent.no}. ${selectedEvent.name} · ${rupiah(selectedEvent.fee)}`

        : "";
  }

  const message =
    encodeURIComponent(

      `Halo Pak Faiz, saya ingin mengirim bukti pembayaran untuk ${selectedEvent?.name || "lomba SPARI HUT RI 81"}.`

    );

  if ($("paymentWaLink")) {

    $("paymentWaLink").href =
      `https://wa.me/${getPaymentWhatsapp()}?text=${message}`;
  }

  clearTimeout(
    paymentCloseTimer
  );

  paymentReminderModal
    .classList
    .remove("is-closing");

  paymentReminderModal
    .classList
    .remove("show");

  void paymentReminderModal.offsetWidth;

  paymentReminderModal
    .classList
    .add("show");

  paymentReminderModal
    .setAttribute(
      "aria-hidden",
      "false"
    );

  document.body
    .classList
    .add("modal-open");

  setTimeout(
    () =>
      $("confirmPaymentReminder")
        ?.focus(),
    360
  );
}

function closePaymentReminder() {

  if (!paymentReminderModal) {
    return;
  }

  if (
    !paymentReminderModal
      .classList
      .contains("show")
  ) return;

  if (
    paymentReminderModal
      .classList
      .contains("is-closing")
  ) return;

  paymentReminderModal
    .setAttribute(
      "aria-hidden",
      "true"
    );

  paymentReminderModal
    .classList
    .add("is-closing");

  clearTimeout(
    paymentCloseTimer
  );

  paymentCloseTimer =
    setTimeout(
      () => {

        paymentReminderModal
          .classList
          .remove(
            "show",
            "is-closing"
          );

        document.body
          .classList
          .remove("modal-open");

      },
      230
    );
}

/* =========================================================
   REGISTRATION
========================================================= */

async function sendRegistration() {

  if (
    pendingRegistration ||
    !selectedEvent
  ) return;

  pendingRegistration =
    true;

  const btn =
    $("submitBtn");

  if (btn) {

    btn.disabled =
      true;

    btn.classList
      .add("loading");
  }

  try {

    const registeredEventId =
      selectedEvent.id;

    const result =
      await api(
        {
          action: "register",

          aeonId:
            $("aeonId")
              ?.value
              .trim() || "",

          name:
            $("name")
              ?.value
              .trim() || "",

          division:
            $("division")
              ?.value
              .trim() || "",

          phone:
            $("phone")
              ?.value
              .trim() || "",

          eventId:
            selectedEvent.id
        },

        {
          timeout: 25000
        }
      );

    latestCode =
      result.code;

    const statusUrl =
      new URL(
        "./status.html",
        location.href
      );

    statusUrl
      .searchParams
      .set(
        "code",
        latestCode
      );

    if ($("successCode")) {

      $("successCode").textContent =
        latestCode;
    }

    if ($("successInfo")) {

      $("successInfo").textContent =

        result.paymentStatus === "Gratis"

          ? "Lomba ini gratis."

          : `Status pembayaran: ${result.paymentStatus}.`;
    }

    $("successModal")
      ?.classList
      .add("show");

    renderSuccessQr(
      statusUrl.href
    );

    const usedEvent =
      EVENTS.find(
        x =>
          x.id ===
          registeredEventId
      );

    if (usedEvent) {

      usedEvent.used =
        Number(
          usedEvent.used || 0
        ) + 1;
    }

    if (PUBLIC) {

      writeCachedPublic(
        PUBLIC
      );
    }

    regForm?.reset();

    selectedEvent =
      null;

    updateEventUI();

    renderPublicConfig();

  } catch (err) {

    toast(
      err.message,
      "error",
      4500
    );

  } finally {

    pendingRegistration =
      false;

    if (btn) {

      btn.classList
        .remove("loading");

      btn.disabled =

        !PUBLIC
          ?.settings
          ?.registrationOpen

        ||

        !EVENTS.length;
    }
  }
}

if (regForm) {

  regForm.addEventListener(
    "submit",
    async e => {

      e.preventDefault();

      if (
        !PUBLIC
          ?.settings
          ?.registrationOpen
      ) {

        return toast(
          "Pendaftaran sedang ditutup.",
          "error"
        );
      }

      if (
        !regForm.reportValidity()
      ) return;

      if (!selectedEvent) {

        return toast(
          "Pilih cabang lomba.",
          "error"
        );
      }

      if (
        Number(
          selectedEvent.fee || 0
        ) > 0
      ) {

        return openPaymentReminder();
      }

      await sendRegistration();
    }
  );
}

/* =========================================================
   POPUP BUTTONS
========================================================= */

if ($("confirmPaymentReminder")) {

  $("confirmPaymentReminder").onclick =
    async () => {

      closePaymentReminder();

      await sendRegistration();
    };
}

if ($("cancelPaymentReminder")) {

  $("cancelPaymentReminder").onclick =
    closePaymentReminder;
}

if ($("closePaymentReminder")) {

  $("closePaymentReminder").onclick =
    closePaymentReminder;
}

paymentReminderModal
  ?.addEventListener(
    "click",
    e => {

      if (
        e.target ===
        paymentReminderModal
      ) {

        closePaymentReminder();
      }
    }
  );

document.addEventListener(
  "keydown",
  e => {

    if (
      e.key === "Escape" &&

      paymentReminderModal
        ?.classList
        .contains("show")
    ) {

      closePaymentReminder();
    }
  }
);

/* =========================================================
   SUCCESS BUTTONS
========================================================= */

if ($("copyCode")) {

  $("copyCode").onclick =
    async () => {

      try {

        await navigator
          .clipboard
          .writeText(
            latestCode
          );

        toast(
          "Kode registrasi disalin.",
          "success"
        );

      } catch {

        toast(
          "Silakan salin kode secara manual."
        );
      }
    };
}

if ($("openCard")) {

  $("openCard").onclick =
    () => {

      const url =
        new URL(
          "./status.html",
          location.href
        );

      url.searchParams
        .set(
          "code",
          latestCode
        );

      location.href =
        url.href;
    };
}

$("successModal")
  ?.addEventListener(
    "click",
    e => {

      if (
        e.target ===
        $("successModal")
      ) {

        $("successModal")
          .classList
          .remove("show");
      }
    }
  );

/* =========================================================
   SCROLL ANIMATION
========================================================= */

const observer =
  "IntersectionObserver" in window

    ? new IntersectionObserver(

        entries => {

          entries.forEach(
            entry => {

              if (
                entry.isIntersecting
              ) {

                entry.target
                  .classList
                  .add("is-visible");

                observer
                  .unobserve(
                    entry.target
                  );
              }
            }
          );

        },

        {
          threshold: 0.12
        }

      )

    : null;

document
  .querySelectorAll(
    ".section-pad,.register-zone"
  )
  .forEach(el => {

    el.classList
      .add("reveal-section");

    if (observer) {

      observer.observe(el);

    } else {

      el.classList
        .add("is-visible");
    }
  });

/* =========================================================
   START
========================================================= */

boot();
