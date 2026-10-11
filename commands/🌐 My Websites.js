/*CMD
  command: 🌐 My Websites
  help: 
  need_reply: false
  auto_retry_time: 
  folder: 

  <<ANSWER

  ANSWER

  <<KEYBOARD

  KEYBOARD
  aliases: 
  group: 
CMD*/

// ===== 🌐 My Websites =====
// ---- গার্ড: মালিক চেক + বট বন্ধ থাকলে সব বন্ধ + লুপ নিজে ঠিক করার ওয়াচডগ ----
var __uid = String(user.telegramid);
var __owner = String(Bot.getProperty("owner_id", ""));
if (!__owner) { Api.sendMessage({ text: "⚠️ বট এখনো সেটআপ হয়নি। প্রথমে /start দিন।" }); return; }
if (__uid !== __owner) { Api.sendMessage({ text: "🚫 এই বটটি শুধু এর মালিক ব্যবহার করতে পারবেন।" }); return; }
if (!Bot.getProperty("isMonitoring", false)) {
    Bot.sendKeyboard("▶️ Start Monitor, ℹ️ Info", "⏸ *বট এখন বন্ধ আছে।*\n\nসব কিছু আবার চালু করতে নিচের *▶️ Start Monitor* বাটন চাপুন।");
    return;
}
var __last = Number(Bot.getProperty("last_tick", 0)) || 0;
if (Date.now() - __last > 60000) { // লুপ থেমে গেলে (৬০ সেকেন্ডের বেশি কোনো চেক নেই) নতুন করে চালু
    var __nid = String(Date.now());
    Bot.setProperty("loop_id", __nid, "string");
    Bot.setProperty("last_tick", Date.now(), "float");
    Bot.run({ command: "pingSites " + __nid });
}
// ---- গার্ড শেষ ----

var sites = Bot.getProperty("monitored_sites", []);
if (!Array.isArray(sites)) { sites = []; }
var names = Bot.getProperty("site_names", []);
if (!Array.isArray(names)) { names = []; }
var cfg = Bot.getProperty("cfg", null);
var interval = (cfg && typeof cfg === "object" && cfg.interval) ? cfg.interval : 10;

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function pad(n) { return (n < 10 ? "0" : "") + n; }
function fmtTime(ts) { // বাংলাদেশ সময় (UTC+6)
    var d = new Date(ts + 6 * 3600 * 1000);
    var h = d.getUTCHours(), ap = h >= 12 ? "PM" : "AM";
    h = h % 12; if (h === 0) { h = 12; }
    return pad(d.getUTCDate()) + "/" + pad(d.getUTCMonth() + 1) + "/" + d.getUTCFullYear() +
           " " + pad(h) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds()) + " " + ap;
}
function fmtDur(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    var m = Math.floor(s / 60); s = s % 60;
    var h = Math.floor(m / 60); m = m % 60;
    if (h > 0) { return h + " ঘণ্টা " + m + " মিনিট"; }
    if (m > 0) { return m + " মিনিট " + s + " সেকেন্ড"; }
    return s + " সেকেন্ড";
}
function isValidUrl(u) {
    u = String(u || "").trim();
    return /^https?:\/\/[^\s\/]+\.[^\s\/]+/i.test(u) && u.toLowerCase().indexOf("your-") === -1;
}

if (sites.length === 0) {
    Api.sendMessage({ text: "⚠️ কোনো সাইট নেই। links কমান্ডের কোডে LINKS তালিকায় লিংক যোগ করুন।", parse_mode: "HTML" });
    return;
}

var msg = "🌐 <b>মনিটর করা " + sites.length + "টি ওয়েবসাইটের তালিকা:</b>\n\n";
for (var i = 0; i < sites.length; i++) {
    var u = String(sites[i] || "").trim();
    var st = Bot.getProperty("site_state_" + i, null);
    var icon = "⚪";
    if (st && typeof st === "object" && st.url === u) { icon = (st.s === "up") ? "🟢" : (st.s === "down" ? "🔴" : "⚪"); }
    var line = icon + " " + (i + 1) + ". " + (names[i] ? "<b>" + esc(names[i]) + "</b> — " : "") + esc(u) + "\n";
    if ((msg + line).length > 3500) { Api.sendMessage({ text: msg, parse_mode: "HTML", disable_web_page_preview: true }); msg = ""; }
    msg += line;
}
msg += "\n💡 প্রতি " + interval + " সেকেন্ডে সবগুলো লিংকে পিং যাচ্ছে, তাই সার্ভার স্লিপে যায় না।\n✏️ লিংক বদলাতে links কমান্ডের কোডে LINKS তালিকা এডিট করুন (/links দিলে সাথে সাথে লোড হবে)।";

Api.sendMessage({ text: msg, parse_mode: "HTML", disable_web_page_preview: true });

