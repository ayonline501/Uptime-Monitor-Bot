/*CMD
  command: 🛑 Stop Monitor
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

// ===== 🛑 Stop Monitor : বট বন্ধ (সব কিছু বন্ধ) =====
var uid = String(user.telegramid);
var owner = String(Bot.getProperty("owner_id", ""));
if (!owner) { Api.sendMessage({ text: "⚠️ বট এখনো সেটআপ হয়নি। প্রথমে /start দিন।" }); return; }
if (uid !== owner) { Api.sendMessage({ text: "🚫 এই বটটি শুধু এর মালিক ব্যবহার করতে পারবেন।" }); return; }

var wasOn = Bot.getProperty("isMonitoring", false);

Bot.setProperty("isMonitoring", false, "boolean");
Bot.setProperty("loop_id", "", "string"); // চলমান লুপ পরের রাউন্ডে নিজে থেকেই থেমে যাবে

Bot.sendKeyboard("▶️ Start Monitor, ℹ️ Info", wasOn
    ? "🛑 *বট বন্ধ করা হয়েছে!*\n\nসব মনিটরিং, পিং ও অ্যালার্ট এখন বন্ধ।\nসব কিছু আবার চালু করতে *▶️ Start Monitor* বাটন চাপুন।"
    : "ℹ️ বট আগে থেকেই বন্ধ আছে।\n\nচালু করতে *▶️ Start Monitor* বাটন চাপুন।");

