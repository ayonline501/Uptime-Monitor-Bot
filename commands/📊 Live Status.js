/*CMD
  command: 📊 Live Status
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

// ===== 📊 Live Status =====
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

var head = "📊 <b>ওয়েবসাইট লাইভ স্ট্যাটাস রিপোর্ট</b>\n━━━━━━━━━━━━━━━━━\n";
var parts = [];
var cur = head;
var upCount = 0, downCount = 0, activeCount = 0;

for (var i = 0; i < sites.length; i++) {
    var url = String(sites[i] || "").trim();
    var block = "\n🔗 <b>সাইট " + (i + 1) + ":</b> " + (names[i] ? "<b>" + esc(names[i]) + "</b> — " : "") + esc(url) + "\n";

    if (!isValidUrl(url)) {
        block += "⚙️ অবস্থা: কনফিগার করা হয়নি (আসল লিংক দিন)\n";
    } else {
        activeCount++;
        var st = Bot.getProperty("site_state_" + i, null);
        if (!st || typeof st !== "object" || st.url !== url || !st.last) {
            block += "⚪ অবস্থা: চেক হচ্ছে (Pending)\n";
        } else {
            var label;
            if (st.s === "up") { label = "🟢 Online"; upCount++; }
            else if (st.s === "down") { label = "🔴 Offline / Down"; downCount++; }
            else { label = "⚪ Pending"; }
            if (st.s !== "down" && st.fails > 0) { label += " (🟡 সর্বশেষ চেক ব্যর্থ, নিশ্চিত হওয়া হচ্ছে)"; }
            block += "⚡ অবস্থা: " + label + "\n";
            if (st.code) { block += "📟 কোড: " + st.code + (st.ms ? " • " + st.ms + " ms" : "") + "\n"; }
            if (st.s === "down") {
                if (st.reason) { block += "⚠️ কারণ: " + esc(st.reason) + "\n"; }
                block += "⏳ ডাউন আছে: " + fmtDur(Date.now() - (st.since || st.last)) + "\n";
            }
            if (st.n > 0) {
                block += "📈 আপটাইম: " + (Math.round(st.okn * 10000 / st.n) / 100) + "% (" + st.n + "টি চেক, " + (st.downs || 0) + "বার ডাউন)\n";
            }
            block += "🕒 শেষ চেক: " + fmtTime(st.last) + "\n";
        }
    }

    if ((cur + block).length > 3500) { parts.push(cur); cur = ""; }
    cur += block;
}

cur += "\n━━━━━━━━━━━━━━━━━\n" +
       "📈 সারাংশ: 🟢 " + upCount + " • 🔴 " + downCount + " • মোট সক্রিয় " + activeCount + "\n" +
       "🔄 <b>বট:</b> চালু ✅ (প্রতি " + interval + " সেকেন্ডে অটো-চেক)";
parts.push(cur);

for (var k = 0; k < parts.length; k++) {
    Api.sendMessage({ text: parts[k], parse_mode: "HTML", disable_web_page_preview: true });
}

