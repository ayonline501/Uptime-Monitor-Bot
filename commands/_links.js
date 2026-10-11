/*CMD
  command: /links
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

// ===== links : 🔗 লিংক সিস্টেম (সব লিংক ও সেটিংস এই কমান্ডের কোডেই) =====
// কমান্ড নাম: links
//
// ✏️ লিংক যোগ করতে / মুছতে / বন্ধ রাখতে শুধু নিচের LINKS তালিকা এডিট করে সেভ করুন।
//    কোনো বাটন বা /add /remove কমান্ড লাগবে না। লিংকের সংখ্যার কোনো সীমা নেই (আনলিমিটেড)।
//
// 📌 নিয়ম:
//    • প্রতিটি লিংক ""-এর ভেতরে লিখুন এবং শেষে কমা (,) দিন।
//    • নামসহ দিতে চাইলে:  "নাম | https://site.com"
//    • https:// না লিখলেও চলবে (নিজে থেকে যোগ হবে)। ডুপ্লিকেট লিংক নিজে বাদ যাবে।
//    • সাময়িক বন্ধ রাখতে লাইনের শুরুতে // বসান (কমেন্ট করুন)। আবার চালু করতে // তুলে দিন।
//
// ⏱ সেভ করার পর সর্বোচ্চ CONFIG.syncSeconds সেকেন্ডের মধ্যে বট নিজেই নতুন লিংক লোড করে নেয়।
//    তাৎক্ষণিক চাইলে বটে /links পাঠান (সাথে সাথে লোড হয়ে তালিকা দেখাবে)।

var LINKS = [
    "https://chatbot-xs3z.onrender.com/",
    // "আমার ব্লগ | https://my-blog.onrender.com/",
    // "https://my-second-site.glitch.me/",
    // এখানে যত খুশি লিংক যোগ করুন...
];

// ⚙️ সেটিংস (বদলে সেভ করলেই কার্যকর হবে)
var CONFIG = {
    interval: 300,       // প্রতি কত সেকেন্ড পরপর সব লিংকে পিং যাবে (৫–৩০)
    failLimit: 3,       // টানা কতবার ব্যর্থ হলে "ডাউন" মেসেজ (১ = সাথে সাথে, ৩ = প্রায় ৩০ সেকেন্ড; সাময়িক গ্লিচে ভুল অ্যালার্ট এড়ায়)
    notifyUp: true,     // ডাউন থেকে আবার চালু হলে মেসেজ দেবে কি না (true / false)
    syncSeconds: 30,    // কোডের লিংক তালিকা কত সেকেন্ড পরপর নিজে লোড হবে (১০–৩০০)
    reportHours: 0,     // প্রতি কত ঘণ্টায় অটো সারাংশ রিপোর্ট আসবে (০ = বন্ধ, যেমন ৬ বা ২৪)
    alertChats: [       // ডাউন/আপ অ্যালার্ট অতিরিক্ত যেখানে যাবে (গ্রুপ/চ্যানেলের চ্যাট আইডি)। বট সেখানে অ্যাডমিন থাকতে হবে।
        // "-1001234567890",
    ]
};

// ================== নিচের কোডে হাত দেওয়ার দরকার নেই ==================
var arg = String(params || "").trim().toLowerCase();
var silent = (arg === "sync");

var uid = String(user.telegramid);
var owner = String(Bot.getProperty("owner_id", ""));
if (!owner) { if (!silent) { Api.sendMessage({ text: "⚠️ বট এখনো সেটআপ হয়নি। প্রথমে /start দিন।" }); } return; }
if (uid !== owner) { if (!silent) { Api.sendMessage({ text: "🚫 এই বটটি শুধু এর মালিক ব্যবহার করতে পারবেন।" }); } return; }

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function norm(u) { return String(u).trim().toLowerCase().replace(/\/+$/, ""); }
function num(v, d, lo, hi) { v = parseInt(v, 10); if (isNaN(v)) { v = d; } return Math.min(hi, Math.max(lo, v)); }

// ---- সেটিংস প্রস্তুত ----
var chats = [];
var rawChats = (CONFIG.alertChats && CONFIG.alertChats.length !== undefined) ? CONFIG.alertChats : [];
for (var c = 0; c < rawChats.length; c++) {
    var cs = String(rawChats[c] || "").trim();
    if (/^-?\d+$/.test(cs)) { chats.push(cs); }
}
var cfg = {
    interval: num(CONFIG.interval, 10, 5, 30),
    failLimit: num(CONFIG.failLimit, 3, 1, 10),
    notifyUp: CONFIG.notifyUp !== false,
    syncSeconds: num(CONFIG.syncSeconds, 30, 10, 300),
    reportHours: num(CONFIG.reportHours, 0, 0, 168),
    alertChats: chats
};

// ---- লিংক পার্স (ভ্যালিড, ডুপ্লিকেটমুক্ত) ----
var newUrls = [], newNames = [], invalid = [], dups = 0, seen = {};
for (var i = 0; i < LINKS.length; i++) {
    var s = String(LINKS[i] || "").trim();
    if (!s) { continue; }
    var name = "", url = s;
    var bar = s.indexOf("|");
    if (bar > -1) { name = s.slice(0, bar).trim(); url = s.slice(bar + 1).trim(); }
    if (!/^https?:\/\//i.test(url)) { url = "https://" + url; }
    if (url.length > 300 || !/^https?:\/\/[^\s\/]+\.[^\s\/]+/i.test(url) || url.toLowerCase().indexOf("your-") !== -1) {
        invalid.push(s);
        continue;
    }
    var key = norm(url);
    if (seen[key]) { dups++; continue; }
    seen[key] = true;
    newUrls.push(url);
    newNames.push(name);
}

// ---- আগের ডাটা ----
var oldSites = Bot.getProperty("monitored_sites", []);
if (!Array.isArray(oldSites)) { oldSites = []; }
var oldNames = Bot.getProperty("site_names", []);
if (!Array.isArray(oldNames)) { oldNames = []; }
var oldCfg = Bot.getProperty("cfg", null);
var firstRun = !Bot.getProperty("links_init", false);

var changed = (JSON.stringify(oldSites) !== JSON.stringify(newUrls));
var states = [];
var added = 0, removed = 0;

if (changed) {
    // আগের স্ট্যাটাস লিংক ধরে ম্যাপ করা হয়, যাতে অপরিবর্তিত লিংকে নতুন করে মেসেজ না আসে
    var oldStates = {};
    for (var a = 0; a < oldSites.length; a++) {
        var st0 = Bot.getProperty("site_state_" + a, null);
        if (st0 && typeof st0 === "object") { oldStates[norm(oldSites[a])] = st0; }
    }
    var oldKeys = {};
    for (var b = 0; b < oldSites.length; b++) { oldKeys[norm(oldSites[b])] = true; }
    for (var d = 0; d < newUrls.length; d++) {
        var k = norm(newUrls[d]);
        var stx = oldStates[k] || null;
        if (stx) { stx.url = newUrls[d]; }
        states.push(stx);
        if (!oldKeys[k]) { added++; }
    }
    for (var e = 0; e < oldSites.length; e++) { if (!seen[norm(oldSites[e])]) { removed++; } }

    Bot.setProperty("monitored_sites", newUrls, "json");
    Bot.setProperty("sites_ver", (parseInt(Bot.getProperty("sites_ver", 0), 10) || 0) + 1, "integer");
    for (var f = 0; f < newUrls.length; f++) { Bot.setProperty("site_state_" + f, states[f], "json"); }
    for (var g = newUrls.length; g < oldSites.length; g++) { Bot.setProperty("site_state_" + g, null, "json"); }
} else {
    for (var h = 0; h < newUrls.length && !silent; h++) { states.push(Bot.getProperty("site_state_" + h, null)); }
}
if (JSON.stringify(oldNames) !== JSON.stringify(newNames)) { Bot.setProperty("site_names", newNames, "json"); }
if (JSON.stringify(oldCfg) !== JSON.stringify(cfg)) { Bot.setProperty("cfg", cfg, "json"); }
Bot.setProperty("last_sync", Date.now(), "float");
if (firstRun) { Bot.setProperty("links_init", true, "boolean"); }

// ---- চুপচাপ সিংক (লুপ থেকে): কখনোই কোনো মেসেজ পাঠায় না ----
if (silent) { return; }

// ---- /links : তালিকা দেখানো ----
var head = "🔗 <b>লিংক সিস্টেম</b>\n━━━━━━━━━━━━━━━━━\n" +
    "📊 মোট সক্রিয় লিংক: <b>" + newUrls.length + "</b>" + (dups ? " • ডুপ্লিকেট বাদ: " + dups : "") + "\n" +
    "⏱ প্রতি " + cfg.interval + " সেকেন্ডে পিং • ডাউন ধরা: টানা " + cfg.failLimit + " বার ব্যর্থ হলে\n" +
    "🔔 আবার-চালু মেসেজ: " + (cfg.notifyUp ? "চালু" : "বন্ধ") +
    " • রিপোর্ট: " + (cfg.reportHours ? "প্রতি " + cfg.reportHours + " ঘণ্টা" : "বন্ধ") +
    " • অতিরিক্ত চ্যাট: " + cfg.alertChats.length + "\n";
if (invalid.length) {
    head += "\n⚠️ <b>ভুল লিংক (বাদ গেছে):</b>\n";
    for (var v = 0; v < invalid.length && v < 10; v++) { head += "• " + esc(invalid[v]) + "\n"; }
    if (invalid.length > 10) { head += "… আরও " + (invalid.length - 10) + "টি\n"; }
}
head += "\n✏️ লিংক বদলাতে এই কমান্ডের কোডে <code>LINKS</code> তালিকা এডিট করে সেভ করুন।\n\n";

var parts = [], cur = head;
if (newUrls.length === 0) {
    cur += "⚠️ কোনো সক্রিয় লিংক নেই। কোডের LINKS তালিকায় লিংক যোগ করুন।";
}
for (var n = 0; n < newUrls.length; n++) {
    var stt = states[n];
    var icon = "⚪";
    if (stt && typeof stt === "object" && stt.url === newUrls[n]) { icon = (stt.s === "up") ? "🟢" : (stt.s === "down" ? "🔴" : "⚪"); }
    var line = icon + " " + (n + 1) + ". " + (newNames[n] ? "<b>" + esc(newNames[n]) + "</b> — " : "") + esc(newUrls[n]) + "\n";
    if ((cur + line).length > 3500) { parts.push(cur); cur = ""; }
    cur += line;
}
parts.push(cur);
for (var p = 0; p < parts.length; p++) {
    Api.sendMessage({ text: parts[p], parse_mode: "HTML", disable_web_page_preview: true });
}

