/*CMD
  command: onCheckError
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

// ===== onCheckError : রিকোয়েস্ট ব্যর্থ/এরর হলে চলে =====
// (onCheckSuccess ও onCheckError-এর লজিক একই; শুধু ডিফল্ট কোড আলাদা)
var p = String(params || "").split(" ");
var idx = parseInt(p[0], 10);
var started = parseInt(p[1], 10);
var isManual = (p[2] === "m");
var ver = parseInt(p[3], 10);
var cfg = Bot.getProperty("cfg", null);
if (!cfg || typeof cfg !== "object") { cfg = {}; }
var FAIL_LIMIT = cfg.failLimit || 3;   // links কমান্ডের CONFIG.failLimit থেকে আসে
var NOTIFY_UP = (cfg.notifyUp !== false);
var INTERVAL = cfg.interval || 10;
var EXTRA_CHATS = (cfg.alertChats && cfg.alertChats.length) ? cfg.alertChats : [];

// অ্যালার্ট মালিকের কাছে + (থাকলে) অতিরিক্ত চ্যাট/গ্রুপ/চ্যানেলে
function notify(text) {
    Api.sendMessage({ text: text, parse_mode: "HTML", disable_web_page_preview: true });
    for (var c = 0; c < EXTRA_CHATS.length; c++) {
        try { Api.sendMessage({ chat_id: EXTRA_CHATS[c], text: text, parse_mode: "HTML", disable_web_page_preview: true }); } catch (e) {}
    }
}

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

// সার্ভার রেসপন্স দিচ্ছে মানে অন: ২xx/৩xx এবং 401/403/405/429 (সার্ভার জীবিত, শুধু বটকে আটকাচ্ছে)
function isUpCode(c) { return (c >= 200 && c < 400) || c === 401 || c === 403 || c === 405 || c === 429; }

function processResult(ok, code, reason) {
    // বট বন্ধ থাকলে (বা আগের সাইট-তালিকার পুরনো রেজাল্ট হলে) কিছুই করবে না
    if (!Bot.getProperty("isMonitoring", false)) { return; }
    var curVer = parseInt(Bot.getProperty("sites_ver", 0), 10) || 0;
    if (!isNaN(ver) && ver !== curVer) { return; }

    var sites = Bot.getProperty("monitored_sites", []);
    if (!Array.isArray(sites) || isNaN(idx) || !sites[idx]) { return; }
    var url = String(sites[idx]).trim();
    var names = Bot.getProperty("site_names", []);
    var nm = (Array.isArray(names) && names[idx]) ? String(names[idx]) : "";
    var lbl = (nm ? "🏷 <b>" + esc(nm) + "</b>\n" : "") + "🔗 " + esc(url);
    var now = Date.now();
    var ms = (started > 0) ? Math.max(0, now - started) : 0;
    var verbose = Bot.getProperty("verbose", false);
    var alerted = false;

    var prev = Bot.getProperty("site_state_" + idx, null);
    if (!prev || typeof prev !== "object" || prev.url !== url) {
        prev = { url: url, s: "pending", fails: 0, since: now, n: 0, okn: 0, downs: 0 };
    }

    var rec = { url: url, s: prev.s, fails: prev.fails || 0, since: prev.since || now,
                last: now, ms: ms, code: code || 0, reason: reason || "",
                n: (prev.n || 0) + 1, okn: (prev.okn || 0) + (ok ? 1 : 0), downs: prev.downs || 0 };

    if (ok) {
        if (prev.s === "down") {
            // অফ থেকে অন হওয়ার সাথে সাথে মেসেজ (একবারই)
            alerted = true;
            if (NOTIFY_UP) {
                notify("🟢 <b>ওয়েবসাইট আবার চালু হয়েছে!</b>\n\n" + lbl +
                       "\n⏳ ডাউনটাইম: " + fmtDur(now - (prev.since || now)) +
                       "\n📟 কোড: " + code + "\n⚡ রেসপন্স: " + ms + " ms\n🕒 " + fmtTime(now));
            }
        }
        // প্রথম চেকে সাইট অন থাকলে কোনো মেসেজ নেই (চুপচাপ চলবে)
        if (prev.s !== "up") { rec.since = now; }
        rec.s = "up";
        rec.fails = 0;
    } else {
        rec.fails = (prev.fails || 0) + 1;
        if (rec.fails >= FAIL_LIMIT && prev.s !== "down") {
            // অন থেকে অফ হওয়ার সাথে সাথে মেসেজ (একবারই; ডাউন থাকলে আর মেসেজ নেই)
            alerted = true;
            rec.s = "down";
            rec.since = now;
            rec.downs = (prev.downs || 0) + 1;
            notify("🔴 <b>অ্যালার্ট! ওয়েবসাইট ডাউন হয়েছে</b>\n\n" + lbl +
                   "\n⚠️ কারণ: " + esc(reason || "রেসপন্স পাওয়া যায়নি") +
                   "\n🕒 " + fmtTime(now) +
                   "\n\n🔁 বট প্রতি " + INTERVAL + " সেকেন্ডে লিংকে রিকোয়েস্ট চালিয়ে যাচ্ছে। চালু হলেই জানাবো।");
        }
    }

    Bot.setProperty("site_state_" + idx, rec, "json");

    if (isManual) {
        var line = ok
            ? "✅ " + lbl + "\n   Online (" + code + ") • " + ms + " ms"
            : "❌ " + lbl + "\n   ব্যর্থ • " + esc(reason || "রেসপন্স নেই");
        Api.sendMessage({ text: line, parse_mode: "HTML", disable_web_page_preview: true });
    } else if (verbose && !alerted) {
        // 📡 Live Updates চালু থাকলে (ডিফল্টে বন্ধ) প্রতিটি চেকের ফলাফল পাঠায়
        Api.sendMessage({
            text: (ok ? "🔄 🟢 " : "🔄 🔴 ") + (nm ? esc(nm) + " — " : "") + esc(url) + "\n" +
                  (ok ? "Online (" + code + ") • " + ms + " ms" : esc(reason || "রেসপন্স নেই")) +
                  " • " + fmtTime(now),
            parse_mode: "HTML", disable_web_page_preview: true
        });
    }
}

var code = (typeof http_status !== "undefined") ? parseInt(http_status, 10) : 0;
if (isNaN(code)) { code = 0; }
if (code > 0 && isUpCode(code)) {
    processResult(true, code, "");
} else if (code > 0) {
    processResult(false, code, "HTTP " + code + (code >= 500 ? " (সার্ভার ত্রুটি)" : " (পেজ/সাইট পাওয়া যায়নি)"));
} else {
    processResult(false, 0, "কানেকশন ব্যর্থ / টাইমআউট (সার্ভার সাড়া দিচ্ছে না)");
}

