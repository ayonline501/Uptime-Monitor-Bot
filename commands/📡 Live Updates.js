/*CMD
  command: 📡 Live Updates
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

// ===== 📡 Live Updates : প্রতিটি চেকের (১০ সেকেন্ড) ফলাফল মেসেজে পাঠানো চালু/বন্ধ =====
// ডিফল্টে বন্ধ। বন্ধ থাকলে শুধু ডাউন/আবার-চালু মেসেজ আসে।
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

var on = Bot.getProperty("verbose", false);
var now = !on;
Bot.setProperty("verbose", now, "boolean");

Api.sendMessage({
    text: now
        ? "📡 <b>Live Updates চালু হয়েছে!</b>\n\nএখন প্রতি ১০ সেকেন্ডের প্রতিটি চেকের ফলাফল মেসেজে পাবেন।\n⚠️ মেসেজ অনেক বেশি আসবে। বন্ধ করতে আবার <b>📡 Live Updates</b> চাপুন।"
        : "📴 <b>Live Updates বন্ধ করা হয়েছে।</b>\n\nএখন থেকে চেক চুপচাপ চলবে; শুধু ডাউন হলে ও আবার চালু হলে মেসেজ পাবেন।",
    parse_mode: "HTML"
});

