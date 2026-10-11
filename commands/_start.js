/*CMD
  command: /start
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

// ===== /start ও ▶️ Start Monitor : বট চালু, লিংক লোড, কিবোর্ড ও অটো-লুপ শুরু =====
// 🔗 লিংক যোগ/মুছতে বটের "links" কমান্ডের কোডে LINKS তালিকা এডিট করুন (কোনো বাটন লাগে না)।

// ---- মালিক সেট/চেক ----
var uid = String(user.telegramid);
var owner = String(Bot.getProperty("owner_id", ""));
if (!owner) { Bot.setProperty("owner_id", uid, "string"); owner = uid; }
if (uid !== owner) {
    Api.sendMessage({ text: "🚫 এই বটটি শুধু এর মালিক ব্যবহার করতে পারবেন।" });
    return;
}

// ---- চালু + নতুন লুপ আইডি (পুরনো সব লুপ নিজে থেকেই বন্ধ, ডুপ্লিকেট হবে না) ----
// স্ট্যাটাস মোছা হয় না, তাই বারবার /start দিলেও আগের অবস্থার জন্য পুনরায় মেসেজ আসে না।
var wasOn = Bot.getProperty("isMonitoring", false);
var loopId = String(Date.now());
Bot.setProperty("isMonitoring", true, "boolean");
Bot.setProperty("loop_id", loopId, "string");
Bot.setProperty("last_tick", Date.now(), "float");
Bot.setProperty("last_sync", Date.now(), "float");
Bot.setProperty("verbose", false, "boolean"); // প্রতি চেকের মেসেজ সবসময় বন্ধ থেকে শুরু

var cfg = Bot.getProperty("cfg", null);
var interval = (cfg && typeof cfg === "object" && cfg.interval) ? cfg.interval : 10;
var saved = Bot.getProperty("monitored_sites", []);
var count = Array.isArray(saved) ? saved.length : 0;

var text = (wasOn ? "✅ *বট আগে থেকেই চালু ছিল, লুপ রিফ্রেশ করা হয়েছে!*" : "🚀 *বট চালু হয়েছে!*") + "\n\n" +
    "🔗 লিংক সিস্টেম থেকে লিংক লোড হচ্ছে (বর্তমানে " + count + "টি)।\n" +
    "⏱ সব লিংক প্রতি " + interval + " সেকেন্ডে চুপচাপ রিফ্রেশ/চেক হবে (কোনো মেসেজ ছাড়া)।\n" +
    "🔔 শুধু সাইট *ডাউন* হলে এবং আবার *চালু* হলে মেসেজ পাবেন।\n" +
    "🔗 সাইট ডাউন থাকলেও লিংকে রিকোয়েস্ট চলতে থাকবে।\n\n" +
    "✏️ লিংক যোগ/মুছতে: বটের *links* কমান্ডের কোডে LINKS তালিকা এডিট করুন।\n" +
    "📋 তালিকা দেখতে: /links\n\n" +
    "নিচের বাটন দিয়ে বট নিয়ন্ত্রণ করুন 👇";

Bot.sendKeyboard("📊 Live Status, 🌐 My Websites\n🔄 Ping Now, 🛑 Stop Monitor\nℹ️ Info, 🔄 Clone", text);

// কোড থেকে লিংক লোড (এখনই), তারপর অটো-লুপ শুরু (২ সেকেন্ড পরে, যাতে লিংক আগে লোড হয়ে যায়)
Bot.run({ command: "links sync" });
Bot.run({ command: "pingSites " + loopId, run_after: 2 });

