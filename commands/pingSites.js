/*CMD
  command: pingSites
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

// ===== pingSites : ব্যাকগ্রাউন্ড ইঞ্জিন =====
// "pingSites <loopId>"  -> অটো-লুপ (কোনো মেসেজ ছাড়া; ইন্টারভাল links কমান্ডের CONFIG.interval থেকে)
// "pingSites manual"    -> একবারের ম্যানুয়াল চেক (লুপ তৈরি করে না)
var arg = String(params || "").trim();
var manual = (arg === "manual");

var cfg = Bot.getProperty("cfg", null);
if (!cfg || typeof cfg !== "object") { cfg = {}; }
var INTERVAL = cfg.interval || 10; // সেকেন্ড

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function pad(n) { return (n < 10 ? "0" : "") + n; }
function fmtTime(ts) { // বাংলাদেশ সময় (UTC+6)
    var d = new Date(ts + 6 * 3600 * 1000);
    var h = d.getUTCHours(), ap = h >= 12 ? "PM" : "AM";
    h = h % 12; if (h === 0) { h = 12; }
    return pad(d.getUTCDate()) + "/" + pad(d.getUTCMonth() + 1) + "/" + d.getUTCFullYear() +
           " " + pad(h) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds()) + " " + ap;
}

if (!manual) {
    var currentLoop = String(Bot.getProperty("loop_id", ""));
    var active = Bot.getProperty("isMonitoring", false);
    // বন্ধ থাকলে বা পুরনো/ডুপ্লিকেট লুপ হলে থেমে যাবে
    if (!active || !arg || arg !== currentLoop) { return; }
    // আগে পরের রাউন্ড শিডিউল: এই রাউন্ডে কোনো সমস্যা হলেও লুপ থামবে না
    Bot.run({ command: "pingSites " + arg, run_after: INTERVAL });
    Bot.setProperty("last_tick", Date.now(), "float"); // ওয়াচডগের জন্য হার্টবিট

    // 🔗 কোডের লিংক তালিকা নির্দিষ্ট সময় পরপর নিজে লোড (এডিট করলে নিজেই ধরে নেবে)
    var syncMs = (cfg.syncSeconds || 30) * 1000;
    if (Date.now() - (Number(Bot.getProperty("last_sync", 0)) || 0) > syncMs) {
        Bot.setProperty("last_sync", Date.now(), "float");
        Bot.run({ command: "links sync" });
    }
} else if (!Bot.getProperty("isMonitoring", false)) {
    return;
}

var sites = Bot.getProperty("monitored_sites", []);
if (!Array.isArray(sites)) { sites = []; }
var ver = parseInt(Bot.getProperty("sites_ver", 0), 10) || 0;

function isValidUrl(u) {
    u = String(u || "").trim();
    if (!/^https?:\/\/[^\s\/]+\.[^\s\/]+/i.test(u)) { return false; }
    if (u.toLowerCase().indexOf("your-") !== -1) { return false; } // placeholder
    return true;
}

var sent = 0;
for (var i = 0; i < sites.length; i++) {
    var url = String(sites[i] || "").trim();
    if (!isValidUrl(url)) { continue; }
    var tail = i + " " + Date.now() + " " + (manual ? "m" : "a") + " " + ver;
    HTTP.get({
        url: url,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AyUptimeBot/3.0)", "Cache-Control": "no-cache" },
        success: "onCheckSuccess " + tail,
        error: "onCheckError " + tail
    });
    sent++;
}

if (manual && sent === 0) {
    Api.sendMessage({
        text: "⚠️ কোনো বৈধ ওয়েবসাইট লিংক নেই।\n✏️ links কমান্ডের কোডে LINKS তালিকায় লিংক যোগ করুন।",
        parse_mode: "HTML"
    });
}

// ---- 📑 অটো সারাংশ রিপোর্ট (CONFIG.reportHours > 0 হলে) ----
if (!manual && cfg.reportHours > 0) {
    var nowTs = Date.now();
    var lastRep = Number(Bot.getProperty("last_report", 0)) || 0;
    if (!lastRep) {
        Bot.setProperty("last_report", nowTs, "float");
    } else if (nowTs - lastRep >= cfg.reportHours * 3600000) {
        Bot.setProperty("last_report", nowTs, "float");
        var names = Bot.getProperty("site_names", []);
        if (!Array.isArray(names)) { names = []; }
        var up = 0, down = 0, pend = 0, downList = "", checks = 0, oks = 0;
        for (var r = 0; r < sites.length; r++) {
            var st = Bot.getProperty("site_state_" + r, null);
            if (!st || typeof st !== "object" || st.url !== String(sites[r]).trim()) { pend++; continue; }
            checks += st.n || 0; oks += st.okn || 0;
            if (st.s === "up") { up++; }
            else if (st.s === "down") {
                down++;
                if (down <= 30) { downList += "🔴 " + (names[r] ? "<b>" + esc(names[r]) + "</b> — " : "") + esc(sites[r]) + "\n"; }
            } else { pend++; }
        }
        var rep = "📑 <b>অটো সারাংশ রিপোর্ট</b>\n━━━━━━━━━━━━━━━━━\n" +
            "🔗 মোট লিংক: " + sites.length + "\n🟢 অন: " + up + " • 🔴 ডাউন: " + down + " • ⚪ পেন্ডিং: " + pend + "\n" +
            (checks > 0 ? "📈 গড় আপটাইম: " + (Math.round(oks * 10000 / checks) / 100) + "%\n" : "") +
            (downList ? "\n<b>এখন ডাউন:</b>\n" + downList : "\n✅ সব লিংক ঠিকভাবে চলছে।\n") +
            "\n🕒 " + fmtTime(nowTs);
        Api.sendMessage({ text: rep, parse_mode: "HTML", disable_web_page_preview: true });
    }
}

