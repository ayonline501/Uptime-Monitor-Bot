/*CMD
  command: 🔄 Ping Now
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

// ===== 🔄 Ping Now =====
// একবার তাৎক্ষণিক চেক (অটো-লুপ আলাদা ও অপরিবর্তিত থাকে, ডুপ্লিকেট লুপ তৈরি হয় না)
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

Api.sendMessage({
    text: "⚡ <b>তাৎক্ষণিক পিং পাঠানো হচ্ছে...</b>\nসবগুলো সাইটে রিকোয়েস্ট গেছে, ফলাফল নিচে আসছে।",
    parse_mode: "HTML"
});

Bot.run({ command: "pingSites manual" });

