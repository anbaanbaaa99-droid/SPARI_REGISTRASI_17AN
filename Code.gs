/*
SPARI HUT RI KE-81 — BACKEND V3 (MAX)

Arsitektur:
GitHub Pages -> Google Apps Script -> Google Spreadsheet

SETUP:
1. Ganti SHEET_ID
2. Ganti ADMIN_PIN
3. Jalankan setupSystem() SATU KALI
4. Deploy Web App:
   Execute as: Me
   Who has access: Anyone
5. Gunakan URL /exec di GITHUB/config.js
*/

const SHEET_ID = "1Fp0uJTSoBejevNSsDLHDSimqFXbuFv8lu3_MT_IXl4E";
const ADMIN_PIN = "223344"; // GANTI sebelum sistem dipakai

const SH_REG = "RegistrasiV2";
const SH_EVENTS = "EventsV2";
const SH_SETTINGS = "SettingsV2";
const SH_LOG = "AdminLogV2";
const SH_CHECKIN = "CheckInLogV2";

const PUBLIC_CACHE_KEY = "publicConfigV4";
const PUBLIC_CACHE_SECONDS = 30;
let SS_CACHE_ = null;

const REG_HEADERS = [
  "Timestamp","Kode Registrasi","ID AEON","Nama","Divisi","WhatsApp",
  "Event ID","Nomor Lomba","Nama Lomba","Tipe","Nama Tim","Anggota Tim JSON",
  "Biaya","Status Pembayaran","Update Pembayaran",
  "Status CheckIn","Waktu CheckIn","Catatan"
];

const EVENT_HEADERS = [
  "Event ID","Nomor","Nama","Tipe","Biaya","Min","Max","Flexible","Kuota","Status","Catatan"
];

const DEFAULT_EVENTS = [
  ["1",1,"E-Sports PS4 eFootball","personal",15000,1,1,false,0,"OPEN","Personal • Seluruh AEON People • Rp15.000 per orang."],
  ["2",2,"Turnamen Futsal","team",100000,6,9,false,0,"OPEN","Department • Minimal 6 peserta, maksimal 9 peserta per tim."],
  ["3",3,"Basket 3x3","team",100000,3,4,false,0,"OPEN","Mix personal • Rp25.000 per orang."],
  ["4",4,"Badminton Ganda","team",20000,2,2,false,0,"OPEN","Ganda 2 orang • Rp20.000 per tim."],
  ["5",5,"Lomba Nyanyi Single","personal",0,1,3,false,0,"OPEN","Single • Gratis."],
  ["6",6,"Lomba Pindahkan Air dengan Kaki","team",0,5,5,false,0,"OPEN","Mix personal • Minimal 5 peserta • Gratis."],
  ["7",7,"Tarik Tambang","team",0,10,10,false,0,"OPEN","Tim • Gratis.• per divisi."],
  ["8",8,"Estafet Bola Menggunakan Stik Balon","team",0,5,5,true,0,"OPEN","Tim • Gratis.• per divisi"],
  ["9",9,"Balap Karung Pakai Helm","team",0,3,3,false,0,"OPEN","Tim • Minimal 3 peserta • Gratis."],
  ["10",10,"Kerupuk Pancing","team",0,4,4,false,0,"OPEN","Tim • Minimal 4 peserta • Gratis."]
];

const DEFAULT_SETTINGS = {
  REGISTRATION_OPEN:"TRUE",
  BANK:"CIMB",
  ACCOUNT_NUMBER:"707503937600",
  ACCOUNT_NAME:"Ahmad Faiz",
  ANNOUNCEMENT:""
};

function setupSystem() {
  const ss = getSS_();

  ensureSheet_(ss, SH_REG, REG_HEADERS);
  const ev = ensureSheet_(ss, SH_EVENTS, EVENT_HEADERS);
  const settings = ensureSheet_(ss, SH_SETTINGS, ["Key","Value"]);
  ensureSheet_(ss, SH_LOG, ["Timestamp","Action","Detail"]);
  ensureSheet_(ss, SH_CHECKIN, ["Timestamp","Kode","ID AEON","Nama","Event ID","Lomba","Status"]);

  if (ev.getLastRow() < 2) {
    ev.getRange(2,1,DEFAULT_EVENTS.length,DEFAULT_EVENTS[0].length).setValues(DEFAULT_EVENTS);
  }

  const existing = settings.getLastRow() >= 2
    ? settings.getRange(2,1,settings.getLastRow()-1,2).getDisplayValues().reduce(function(o,r){o[r[0]]=r[1];return o;},{})
    : {};

  Object.keys(DEFAULT_SETTINGS).forEach(function(key){
    if (!(key in existing)) settings.appendRow([key,DEFAULT_SETTINGS[key]]);
  });

  [SH_REG,SH_EVENTS,SH_SETTINGS,SH_LOG,SH_CHECKIN].forEach(function(name){
    const sh = ss.getSheetByName(name);
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,sh.getLastColumn()).setFontWeight("bold").setBackground("#b91c1c").setFontColor("#ffffff");
  });

  ev.autoResizeColumns(1, EVENT_HEADERS.length);
  settings.autoResizeColumns(1,2);
  clearPublicCache_();
}

function doGet() {
  return json_({ok:true,app:"SPARI HUT RI 81",status:"online"});
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) throw new Error("Request kosong.");
    const body = JSON.parse(e.postData.contents);
    const action = String(body.action || "");

    switch (action) {
      case "publicConfig": return json_(publicConfig_());
      case "register": return register_(body);
      case "publicStatus": return json_({ok:true,data:publicStatus_(body.code)});

      case "adminLogin": return adminLogin_(body.pin);
      case "adminPing": requireToken_(body.token); return json_({ok:true});
      case "adminLogout": adminLogout_(body.token); return json_({ok:true});
      case "adminSnapshot": requireToken_(body.token); return adminSnapshot_();
      case "adminLookup": requireToken_(body.token); return json_({ok:true,data:adminLookup_(body.code)});
      case "updatePayment": requireToken_(body.token); return updatePayment_(body);
      case "setCheckIn": requireToken_(body.token); return setCheckIn_(body);
      case "deleteRegistration": requireToken_(body.token); return deleteRegistration_(body);
      case "updateEvent": requireToken_(body.token); return updateEvent_(body);
      case "updateSettings": requireToken_(body.token); return updateSettings_(body);
      default: throw new Error("Action tidak dikenali.");
    }
  } catch (err) {
    console.error(err);
    return json_({ok:false,message:err && err.message ? err.message : String(err)});
  }
}

/* ---------- PUBLIC ---------- */

function publicConfig_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(PUBLIC_CACHE_KEY);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }

  const data = {ok:true,events:publicEvents_(),settings:publicSettings_()};
  try { cache.put(PUBLIC_CACHE_KEY,JSON.stringify(data),PUBLIC_CACHE_SECONDS); } catch (e) {}
  return data;
}

function clearPublicCache_() {
  try { CacheService.getScriptCache().remove(PUBLIC_CACHE_KEY); } catch (e) {}
}

function publicEvents_() {
  const events = getEvents_();
  const used = eventUsage_();
  return events.map(function(ev){
    return {
      id:ev.id,no:ev.no,name:ev.name,type:ev.type,fee:ev.fee,min:ev.min,max:ev.max,
      flexible:ev.flexible,quota:ev.quota,status:ev.status,note:ev.note,used:used[ev.id]||0
    };
  });
}

function publicSettings_() {
  const s = getSettings_();
  return {
    registrationOpen:String(s.REGISTRATION_OPEN).toUpperCase()==="TRUE",
    bank:s.BANK||"",
    accountNumber:s.ACCOUNT_NUMBER||"",
    accountName:s.ACCOUNT_NAME||"",
    announcement:s.ANNOUNCEMENT||""
  };
}

function register_(d) {
  const settings = publicSettings_();
  if (!settings.registrationOpen) throw new Error("Pendaftaran sedang ditutup oleh panitia.");

  const events = getEvents_();
  const ev = events.filter(function(x){return x.id===clean_(d.eventId,20);})[0];
  if (!ev) throw new Error("Cabang lomba tidak valid.");
  if (ev.status !== "OPEN") throw new Error("Cabang lomba ini sedang ditutup.");

  const usage = eventUsage_()[ev.id] || 0;
  if (ev.quota > 0 && usage >= ev.quota) throw new Error("Kuota cabang lomba ini sudah penuh.");

  const aeonId = clean_(d.aeonId,40);
  const name = clean_(d.name,120);
  const division = clean_(d.division,100);
  const phone = clean_(d.phone,30).replace(/[\s-]/g,"");
  // Registrasi lomba tim hanya memakai data 1 perwakilan / PIC.
  // Nama tim dan daftar anggota tidak diwajibkan agar proses registrasi tetap ringan.
  const teamName = "";
  const members = [];

  if (!aeonId || !name || !division || !phone) throw new Error("ID AEON, nama, divisi, dan WhatsApp wajib diisi.");
  if (!/^[A-Za-z0-9._-]+$/.test(aeonId)) throw new Error("Format ID AEON tidak valid.");
  if (!/^\+?[0-9]{8,16}$/.test(phone)) throw new Error("Nomor WhatsApp tidak valid.");

  const ids = [aeonId];

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error("Server sedang sibuk. Coba beberapa detik lagi.");

  try {
    const sh = getSheet_(SH_REG);
    const existingIds = participantIdsInEvent_(sh,ev.id);
    ids.forEach(function(id){
      if (existingIds[String(id).toLowerCase()]) throw new Error("ID AEON "+id+" sudah terdaftar pada lomba yang sama.");
    });

    const code = createCode_();
    const payStatus = ev.fee > 0 ? "Belum Bayar" : "Gratis";

    sh.appendRow([
      new Date(),code,aeonId,name,division,phone,
      ev.id,ev.no,ev.name,ev.type,ev.type==="team"?teamName:"",
      JSON.stringify(members),ev.fee,payStatus,"",
      "Belum Hadir","",""
    ]);
    clearPublicCache_();

    return json_({ok:true,code:code,eventName:ev.name,fee:ev.fee,paymentStatus:payStatus});
  } finally {
    lock.releaseLock();
  }
}

function publicStatus_(code) {
  const row = registrationByCode_(clean_(code,80));
  if (!row) throw new Error("Kode registrasi tidak ditemukan.");
  return {
    code:row.code,name:row.name,division:row.division,eventNo:row.eventNo,eventName:row.eventName,
    teamName:row.teamName,fee:row.fee,paymentStatus:row.paymentStatus,
    checkInStatus:row.checkInStatus,checkInTime:row.checkInTime,timestamp:row.timestamp
  };
}

/* ---------- ADMIN AUTH ---------- */

function adminLogin_(pin) {
  if (String(pin||"") !== String(ADMIN_PIN)) {
    Utilities.sleep(350);
    throw new Error("PIN admin salah.");
  }
  const token = Utilities.getUuid().replace(/-/g,"") + Utilities.getUuid().replace(/-/g,"");
  CacheService.getScriptCache().put("admin:"+token,"1",21600);
  log_("LOGIN","Admin login");
  return json_({ok:true,token:token,expiresIn:21600});
}

function requireToken_(token) {
  if (!token || CacheService.getScriptCache().get("admin:"+String(token)) !== "1") {
    throw new Error("Sesi admin berakhir. Silakan login kembali.");
  }
}

function adminLogout_(token) {
  if (token) CacheService.getScriptCache().remove("admin:"+String(token));
  log_("LOGOUT","Admin logout");
}

/* ---------- ADMIN DATA ---------- */

function adminSnapshot_() {
  return json_({
    ok:true,
    registrations:listRegistrations_(),
    events:publicEvents_(),
    settings:publicSettings_(),
    logs:listLogs_(25),
    checkins:listCheckins_(25)
  });
}

function adminLookup_(code) {
  const row = registrationByCode_(clean_(code,80));
  if (!row) throw new Error("Kode registrasi tidak ditemukan.");
  return row;
}

function updatePayment_(d) {
  const code = clean_(d.code,80);
  const status = clean_(d.status,30);
  if (["Sudah Bayar","Belum Bayar"].indexOf(status)===-1) throw new Error("Status pembayaran tidak valid.");

  const row = findRegistrationRow_(code);
  if (!row) throw new Error("Kode registrasi tidak ditemukan.");

  const sh = getSheet_(SH_REG);
  const fee = Number(sh.getRange(row,13).getValue()||0);
  if (fee <= 0) throw new Error("Lomba gratis tidak memerlukan verifikasi pembayaran.");

  sh.getRange(row,14).setValue(status);
  sh.getRange(row,15).setValue(new Date());
  log_("PAYMENT",code+" -> "+status);
  return json_({ok:true});
}

function setCheckIn_(d) {
  const code = clean_(d.code,80);
  const present = d.present === true;
  const row = findRegistrationRow_(code);
  if (!row) throw new Error("Kode registrasi tidak ditemukan.");

  const sh = getSheet_(SH_REG);
  const status = present ? "Hadir" : "Belum Hadir";
  const time = present ? new Date() : "";

  sh.getRange(row,16).setValue(status);
  sh.getRange(row,17).setValue(time);

  const data = registrationByCode_(code);
  getSheet_(SH_CHECKIN).appendRow([new Date(),code,data.aeonId,data.name,data.eventId,data.eventName,status]);
  log_("CHECKIN",code+" -> "+status);
  return json_({ok:true,status:status});
}

function deleteRegistration_(d) {
  const code = clean_(d.code,80);
  const row = findRegistrationRow_(code);
  if (!row) throw new Error("Kode registrasi tidak ditemukan.");
  getSheet_(SH_REG).deleteRow(row);
  clearPublicCache_();
  log_("DELETE",code);
  return json_({ok:true});
}

function updateEvent_(d) {
  const id = clean_(d.eventId,20);
  const sh = getSheet_(SH_EVENTS);
  const last = sh.getLastRow();
  if (last < 2) throw new Error("Data lomba tidak tersedia.");

  const rows = sh.getRange(2,1,last-1,EVENT_HEADERS.length).getValues();
  let target = 0;
  for (let i=0;i<rows.length;i++) if (String(rows[i][0])===id) {target=i+2;break;}
  if (!target) throw new Error("Cabang lomba tidak ditemukan.");

  const fee = Math.max(0,Number(d.fee)||0);
  const quota = Math.max(0,Math.floor(Number(d.quota)||0));
  const status = String(d.status)==="CLOSED" ? "CLOSED":"OPEN";

  sh.getRange(target,5).setValue(fee);
  sh.getRange(target,9).setValue(quota);
  sh.getRange(target,10).setValue(status);
  clearPublicCache_();
  log_("EVENT_UPDATE","Event "+id+" fee="+fee+" quota="+quota+" status="+status);
  return json_({ok:true});
}

function updateSettings_(d) {
  setSetting_("REGISTRATION_OPEN",d.registrationOpen ? "TRUE":"FALSE");
  setSetting_("BANK",clean_(d.bank,80));
  setSetting_("ACCOUNT_NUMBER",clean_(d.accountNumber,80));
  setSetting_("ACCOUNT_NAME",clean_(d.accountName,100));
  setSetting_("ANNOUNCEMENT",clean_(d.announcement,500));
  clearPublicCache_();
  log_("SETTINGS","Public settings updated");
  return json_({ok:true});
}

/* ---------- READERS ---------- */

function listRegistrations_() {
  const sh = getSheet_(SH_REG);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const rows = sh.getRange(2,1,last-1,REG_HEADERS.length).getValues();
  const tz = timezone_();

  return rows.map(function(r){ return mapRegistrationRow_(r,tz); }).reverse();
}

function registrationByCode_(code) {
  const row = findRegistrationRow_(code);
  if (!row) return null;
  const values = getSheet_(SH_REG).getRange(row,1,1,REG_HEADERS.length).getValues()[0];
  return mapRegistrationRow_(values,timezone_());
}

function mapRegistrationRow_(r,tz) {
  let members=[];
  try { members=JSON.parse(String(r[11]||"[]")); } catch(e) {}
  return {
    timestamp:formatDate_(r[0],tz),code:String(r[1]||""),aeonId:String(r[2]||""),
    name:String(r[3]||""),division:String(r[4]||""),phone:String(r[5]||""),
    eventId:String(r[6]||""),eventNo:Number(r[7]||0),eventName:String(r[8]||""),
    type:String(r[9]||""),teamName:String(r[10]||""),members:members,
    fee:Number(r[12]||0),paymentStatus:String(r[13]||""),
    paymentUpdatedAt:formatDate_(r[14],tz),checkInStatus:String(r[15]||"Belum Hadir"),
    checkInTime:formatDate_(r[16],tz),note:String(r[17]||"")
  };
}

function getEvents_() {
  const sh = getSheet_(SH_EVENTS);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const rows = sh.getRange(2,1,last-1,EVENT_HEADERS.length).getValues();
  return rows.map(function(r){
    return {
      id:String(r[0]),no:Number(r[1]),name:String(r[2]),type:String(r[3]),
      fee:Number(r[4]||0),min:Number(r[5]||1),max:Number(r[6]||1),
      flexible:String(r[7]).toUpperCase()==="TRUE" || r[7]===true,
      quota:Number(r[8]||0),status:String(r[9]||"OPEN").toUpperCase(),note:String(r[10]||"")
    };
  }).sort(function(a,b){return a.no-b.no;});
}

function getSettings_() {
  const sh = getSheet_(SH_SETTINGS);
  const last = sh.getLastRow();
  const out = {};
  if (last >= 2) {
    sh.getRange(2,1,last-1,2).getDisplayValues().forEach(function(r){out[r[0]]=r[1];});
  }
  return out;
}

function setSetting_(key,value) {
  const sh = getSheet_(SH_SETTINGS);
  const last = sh.getLastRow();
  if (last >= 2) {
    const vals = sh.getRange(2,1,last-1,1).getDisplayValues();
    for (let i=0;i<vals.length;i++) {
      if (vals[i][0]===key) {sh.getRange(i+2,2).setValue(value);return;}
    }
  }
  sh.appendRow([key,value]);
}

function eventUsage_() {
  const out = {};
  const sh = getSheet_(SH_REG);
  const last = sh.getLastRow();
  if (last < 2) return out;
  sh.getRange(2,7,last-1,1).getDisplayValues().forEach(function(r){
    const id = String(r[0]||"");
    if (id) out[id]=(out[id]||0)+1;
  });
  return out;
}

function listLogs_(limit) {
  const sh = getSheet_(SH_LOG), last=sh.getLastRow();
  if (last<2) return [];
  const n=Math.min(Number(limit)||25,last-1), start=last-n+1;
  return sh.getRange(start,1,n,3).getValues().reverse().map(function(r){
    return {time:formatDate_(r[0],timezone_()),action:String(r[1]||""),detail:String(r[2]||"")};
  });
}

function listCheckins_(limit) {
  const sh = getSheet_(SH_CHECKIN), last=sh.getLastRow();
  if (last<2) return [];
  const rows=sh.getRange(2,1,last-1,7).getValues().reverse().filter(function(r){return String(r[6])==="Hadir";}).slice(0,Number(limit)||25);
  return rows.map(function(r){
    return {time:formatDate_(r[0],timezone_()),code:String(r[1]||""),aeonId:String(r[2]||""),name:String(r[3]||""),eventId:String(r[4]||""),eventName:String(r[5]||"")};
  });
}

/* ---------- HELPERS ---------- */

function participantIdsInEvent_(sh,eventId) {
  const out = {};
  const last = sh.getLastRow();
  if (last < 2) return out;

  // Baca C:L sekali saja: ID AEON (C), Event ID (G), Members JSON (L).
  const rows = sh.getRange(2,3,last-1,10).getValues();
  rows.forEach(function(r){
    if (String(r[4]) !== String(eventId)) return;
    const ownerId = String(r[0]||"").toLowerCase();
    if (ownerId) out[ownerId] = true;
    let members=[];
    try { members=JSON.parse(String(r[9]||"[]")); } catch(e) {}
    members.forEach(function(m){
      const id = String(m && m.id || "").toLowerCase();
      if (id) out[id] = true;
    });
  });
  return out;
}

function aeonAlreadyInEvent_(sh,aeonId,eventId) {
  return !!participantIdsInEvent_(sh,eventId)[String(aeonId||"").toLowerCase()];
}

function findRegistrationRow_(code) {
  const sh=getSheet_(SH_REG), last=sh.getLastRow();
  if(last<2)return 0;
  const found = sh.getRange(2,2,last-1,1)
    .createTextFinder(String(code||""))
    .matchEntireCell(true)
    .findNext();
  return found ? found.getRow() : 0;
}

function createCode_() {
  const date=Utilities.formatDate(new Date(),timezone_(),"yyMMdd");
  const suffix=Utilities.getUuid().replace(/-/g,"").substring(0,6).toUpperCase();
  return "SPARI81-"+date+"-"+suffix;
}

function log_(action,detail) {
  try{getSheet_(SH_LOG).appendRow([new Date(),action,detail]);}catch(e){}
}

function ensureSheet_(ss,name,headers) {
  let sh=ss.getSheetByName(name);
  if(!sh) sh=ss.insertSheet(name);
  if(sh.getLastRow()===0) sh.getRange(1,1,1,headers.length).setValues([headers]);
  else sh.getRange(1,1,1,headers.length).setValues([headers]);
  return sh;
}

function getSS_() {
  if(!SHEET_ID || SHEET_ID.indexOf("GANTI_")===0) throw new Error("SHEET_ID belum diisi di Code.gs.");
  if (!SS_CACHE_) SS_CACHE_ = SpreadsheetApp.openById(SHEET_ID);
  return SS_CACHE_;
}

function getSheet_(name) {
  const ss=getSS_();
  const sh=ss.getSheetByName(name);
  if(!sh) throw new Error("Sheet "+name+" belum ada. Jalankan setupSystem() terlebih dahulu.");
  return sh;
}

function clean_(value,maxLength) {
  return String(value==null?"":value).replace(/[\u0000-\u001F\u007F]/g,"").trim().substring(0,maxLength||200);
}

function timezone_() {
  return Session.getScriptTimeZone() || "Asia/Jakarta";
}

function formatDate_(value,tz) {
  return value instanceof Date ? Utilities.formatDate(value,tz||timezone_(),"dd/MM/yyyy HH:mm") : String(value||"");
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
