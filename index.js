const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
app.use(express.json());

// Environment variables
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || 'YOUR_CHAT_ID';
const AFFILIATE_LINK = process.env.AFFILIATE_LINK || 'https://mostbet-king.com/5rTs';
const VERCEL_URL = process.env.VERCEL_URL || 'YOUR_VERCEL_URL';

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

// Storage
let users = {};
let stats = { total: 0, registered: 0, deposited: 0 };
let postbackData = { registrations: {}, deposits: {} };

// ALL LANGUAGES
const languages = {
  en: {
    name: "English",
    flag: "🇺🇸",
    welcome: "✅ You selected English!",
    selectLanguage: "Select your preferred language:",
    step1: "🌐 Step 1 - Register",
    mustNew: "‼️ THE ACCOUNT MUST BE NEW",
    instructions: `1️⃣ If after clicking the "REGISTER" button you get to the old account, you need to log out of it and click the button again.\n\n2️⃣ Specify a promocode during registration: CLAIM\n\n3️⃣ Make a Minimum deposit atleast 600₹ or 6$ in any currency`,
    enterPlayerId: "Please enter your Mostbet Player ID to verify:",
    howToFind: "📝 How to find Player ID:\n1. Login to Mostbet account\n2. Go to Profile Settings\n3. Copy Player ID number\n4. Paste it here",
    congratulations: "Congratulations, Please Select Your Game Mode For Play:",
    notRegistered: "❌ Sorry, You're Not Registered!\nPlease click the REGISTER button first and complete your registration using our affiliate link.\nAfter successful registration, come back and enter your Player ID.",
    registeredNoDeposit: `🎉 Great, you have successfully completed registration!\n✅ Your account is synchronized with the bot\n💴 To gain access to signals, deposit your account (make a deposit) with at least 600₹ or $6 in any currency\n🕹️ After successfully replenishing your account, click on the CHECK DEPOSIT button and gain access`,
    limitReached: "You're Reached Your Limited, please try again tomorrow for continue prediction or if you want to continue to deposit again atleast 400₹ or 4$ in any currency"
  },
  hi: {
    name: "हिंदी",
    flag: "🇮🇳", 
    welcome: "✅ आपने हिंदी चुनी!",
    selectLanguage: "अपनी पसंदीदा भाषा चुनें:",
    step1: "🌐 स्टेप 1 - रजिस्टर करें",
    mustNew: "‼️ अकाउंट नया होना चाहिए",
    instructions: `1️⃣ अगर "REGISTER" बटन पर क्लिक करने के बाद आप पुराने अकाउंट में आते हैं, तो लॉग आउट करके फिर से बटन पर क्लिक करें\n\n2️⃣ रजिस्ट्रेशन के दौरान प्रोमोकोड दर्ज करें: CLAIM\n\n3️⃣ न्यूनतम 600₹ या 6$ जमा करें`,
    enterPlayerId: "कृपया सत्यापन के लिए अपना Mostbet Player ID दर्ज करें:",
    howToFind: "📝 Player ID कैसे ढूंढें:\n1. Mostbet अकाउंट में लॉगिन करें\n2. प्रोफाइल सेटिंग्स पर जाएं\n3. Player ID नंबर कॉपी करें\n4. यहां पेस्ट करें",
    congratulations: "बधाई हो, कृपया खेलने के लिए अपना गेम मोड चुनें:",
    notRegistered: "❌ क्षमा करें, आप रजिस्टर्ड नहीं हैं!\nकृपया पहले REGISTER बटन पर क्लिक करें और हमारे एफिलिएट लिंक का उपयोग करके रजिस्ट्रेशन पूरा करें\nसफल रजिस्ट्रेशन के बाद वापस आएं और अपना Player ID दर्ज करें",
    registeredNoDeposit: `🎉 बढ़िया, आपने सफलतापूर्वक रजिस्ट्रेशन पूरा कर लिया है!\n✅ आपका अकाउंट बॉट के साथ सिंक हो गया है\n💴 सिग्नल तक पहुंच प्राप्त करने के लिए, अपने अकाउंट में कम से कम 600₹ या $6 जमा करें\n🕹️ अपना अकाउंट सफलतापूर्वक रिचार्ज करने के बाद, CHECK DEPOSIT बटन पर क्लिक करें`,
    limitReached: "आप अपनी सीमा तक पहुँच गए हैं, कृपया कल फिर से कोशिश करें या जारी रखने के लिए फिर से कम से कम 400₹ या 4$ जमा करें"
  },
  bn: {
    name: "বাংলা",
    flag: "🇧🇩",
    welcome: "✅ আপনি বাংলা নির্বাচন করেছেন!",
    selectLanguage: "আপনার পছন্দের ভাষা নির্বাচন করুন:",
    step1: "🌐 ধাপ 1 - নিবন্ধন করুন",
    mustNew: "‼️ অ্যাকাউন্টটি নতুন হতে হবে",
    instructions: `1️⃣ "REGISTER" বাটনে ক্লিক করার পরে যদি আপনি পুরানো অ্যাকাউন্টে প্রবেশ করেন, তাহলে আপনাকে লগআউট করে আবার বাটনে ক্লিক করতে হবে\n\n2️⃣ নিবন্ধনের সময় প্রমোকোড নির্দিষ্ট করুন: CLAIM\n\n3️⃣ ন্যূনতম 600₹ বা 6$ জমা করুন`,
    enterPlayerId: "যাচাই করার জন্য আপনার Mostbet Player ID লিখুন:",
    howToFind: "📝 Player ID কিভাবে খুঁজে পাবেন:\n1. Mostbet অ্যাকাউন্টে লগইন করুন\n2. প্রোফাইল সেটিংসে যান\n3. Player ID নম্বর কপি করুন\n4. এখানে পেস্ট করুন",
    congratulations: "অভিনন্দন, খেলার জন্য আপনার গেম মোড নির্বাচন করুন:",
    notRegistered: "❌ দুঃখিত, আপনি নিবন্ধিত নন!\nঅনুগ্রহ করে প্রথমে REGISTER বাটনে ক্লিক করুন এবং আমাদের অ্যাফিলিয়েট লিঙ্ক ব্যবহার করে নিবন্ধন সম্পূর্ণ করুন\nসফল নিবন্ধনের পরে ফিরে আসুন এবং আপনার Player ID লিখুন",
    registeredNoDeposit: `🎉 দুর্দান্ত, আপনি সফলভাবে নিবন্ধন সম্পূর্ণ করেছেন!\n✅ আপনার অ্যাকাউন্ট বটের সাথে সিঙ্ক হয়েছে\n💴 সিগন্যাল অ্যাক্সেস পেতে, আপনার অ্যাকাউন্টে কমপক্ষে 600₹ বা $6 জমা করুন\n🕹️ আপনার অ্যাকাউন্ট সফলভাবে রিচার্জ করার পরে, CHECK DEPOSIT বাটনে ক্লিক করুন এবং অ্যাক্সেস পান`,
    limitReached: "আপনি আপনার সীমায় পৌঁছেছেন, অনুগ্রহ করে আগামীকাল আবার চেষ্টা করুন বা চালিয়ে যেতে আবার কমপক্ষে 400₹ বা 4$ জমা করুন"
  },
  ur: {
    name: "اردو",
    flag: "🇵🇰",
    welcome: "✅ آپ نے اردو منتخب کی!",
    selectLanguage: "اپنی پسندیدہ زبان منتخب کریں:",
    step1: "🌐 مرحلہ 1 - رجسٹر کریں",
    mustNew: "‼️ اکاؤنٹ نیا ہونا چاہیے",
    instructions: `1️⃣ اگر "REGISTER" بٹن پر کلک کرنے کے بعد آپ پرانے اکاؤنٹ میں آتے ہیں، تو آپ کو لاگ آؤٹ ہو کر دوبارہ بٹن پر کلک کرنا ہوگا\n\n2️⃣ رجسٹریشن کے دوران پروموکوڈ指定 کریں: CLAIM\n\n3️⃣ کم از کم 600₹ یا 6$ جمع کریں`,
    enterPlayerId: "براہ کرم تصدیق کے لیے اپنا Mostbet Player ID درج کریں:",
    howToFind: "📝 Player ID کیسے ڈھونڈیں:\n1. Mostbet اکاؤنٹ میں لاگ ان کریں\n2\. پروفائل سیٹنگز پر جائیں\n3. Player ID نمبر کاپی کریں\n4. یہاں پیسٹ کریں",
    congratulations: "مبارک ہو، براہ کرم کھیلنے کے لیے اپنا گیم موڈ منتخب کریں:",
    notRegistered: "❌ معذرت، آپ رجسٹرڈ نہیں ہیں!\nبراہ کرم پہلے REGISTER بٹن پر کلک کریں اور ہمارے affiliate link کا استعمال کرتے ہوئے رجسٹریشن مکمل کریں\nکامیاب رجسٹریشن کے بعد واپس آئیں اور اپنا Player ID درج کریں",
    registeredNoDeposit: `🎉 بہت اچھا، آپ نے کامیابی کے ساتھ رجسٹریشن مکمل کر لی ہے!\n✅ آپ کا اکاؤنٹ بوٹ کے ساتھ sync ہو گیا ہے\n💴 سگنلز تک رسائی حاصل کرنے کے لیے، اپنے اکاؤنٹ میں کم از کم 600₹ یا $6 جمع کریں\n🕹️ اپنے اکاؤنٹ کو کامیابی سے ری چارج کرنے کے بعد، CHECK DEPOSIT بٹن پر کلک کریں اور رسائی حاصل کریں`,
    limitReached: "آپ اپنی حد تک پہنچ گئے ہیں، براہ کرم کل دوبارہ کوشش کریں یا جاری رکھنے کے لیے دوبارہ کم از کم 400₹ یا 4$ جمع کریں"
  },
  ne: {
    name: "नेपाली",
    flag: "🇳🇵",
    welcome: "✅ तपाईंले नेपाली चयन गर्नुभयो!",
    selectLanguage: "आफ्नो मनपर्ने भाषा चयन गर्नुहोस्:",
    step1: "🌐 चरण 1 - दर्ता गर्नुहोस्",
    mustNew: "‼️ खाता नयाँ हुनुपर्छ",
    instructions: `1️⃣ यदि "REGISTER" बटन क्लिक गरेपछि तपाईं पुरानो खातामा पुग्नुहुन्छ भने, तपाईंले लगआउट गरेर फेरि बटन क्लिक गर्नुपर्छ\n\n2️⃣ दर्ता समयमा प्रोमोकोड निर्दिष्ट गर्नुहोस्: CLAIM\n\n3️⃣ कम्तिमा 600₹ वा 6$ जम्मा गर्नुहोस्`,
    enterPlayerId: "कृपया सत्यापन गर्न आफ्नो Mostbet Player ID प्रविष्ट गर्नुहोस्:",
    howToFind: "📝 Player ID कसरी खोज्ने:\n1. Mostbet खातामा लगइन गर्नुहोस्\n2. प्रोफाइल सेटिङहरूमा जानुहोस्\n3. Player ID नम्बर कपी गर्नुहोस्\n4. यहाँ पेस्ट गर्नुहोस्",
    congratulations: "बधाई छ, कृपया खेल्नको लागि आफ्नो खेल मोड चयन गर्नुहोस्:",
    notRegistered: "❌ माफ गर्नुहोस्, तपाईं दर्ता गरिएको छैन!\nकृपया पहिले REGISTER बटन क्लिक गर्नुहोस् र हाम्रो एफिलिएट लिङ्क प्रयोग गरेर दर्ता पूरा गर्नुहोस्\nसफल दर्ता पछि फर्कनुहोस् र आफ्नो Player ID प्रविष्ट गर्नुहोस्",
    registeredNoDeposit: `🎉 राम्रो, तपाईंले सफलतापूर्वक दर्ता पूरा गर्नुभयो!\n✅ तपाईंको खाता बोटसँग सिङ्क भएको छ\n💴 सिग्नलहरू पहुँच प्राप्त गर्न, आफ्नो खातामा कम्तिमा 600₹ वा $6 जम्मा गर्नुहोस्\n🕹️ आफ्नो खाता सफलतापूर्वक रिचार्ज गरेपछि, CHECK DEPOSIT बटन क्लिक गर्नुहोस् र पहुँच प्राप्त गर्नुहोस्`,
    limitReached: "तपाईं आफ्नो सीमामा पुग्नुभयो, कृपया भोली फेरि प्रयास गर्नुहोस् वा जारी राख्नका लागि फेरि कम्तिमा 400₹ वा 4$ जम्मा गर्नुहोस्"
  }
};

// ALL PREDICTION IMAGES
const predictionImages = {
  easy: [
    { url: "https://i.postimg.cc/dQS5pr0N/IMG-20251020-095836-056.jpg", accuracy: "85%" },
    { url: "https://i.postimg.cc/P5BxR3GJ/IMG-20251020-095841-479.jpg", accuracy: "95%" },
    { url: "https://i.postimg.cc/QdWN1QBr/IMG-20251020-095848-018.jpg", accuracy: "78%" },
    { url: "https://i.postimg.cc/gjJmJ89H/IMG-20251020-095902-112.jpg", accuracy: "85%" },
    { url: "https://i.postimg.cc/QMJ3J0hQ/IMG-20251020-095906-484.jpg", accuracy: "70%" },
    { url: "https://i.postimg.cc/654xm9BR/IMG-20251020-095911-311.jpg", accuracy: "80%" },
    { url: "https://i.postimg.cc/NMCZdnVX/IMG-20251020-095916-536.jpg", accuracy: "82%" },
    { url: "https://i.postimg.cc/8k3qWqLk/IMG-20251020-095921-307.jpg", accuracy: "88%" },
    { url: "https://i.postimg.cc/pdqSd72R/IMG-20251020-095926-491.jpg", accuracy: "75%" },
    { url: "https://i.postimg.cc/05T9x6WH/IMG-20251020-095937-768.jpg", accuracy: "90%" },
    { url: "https://i.postimg.cc/CKrV2dnv/IMG-20251020-095949-124.jpg", accuracy: "83%" },
    { url: "https://i.postimg.cc/L5dGdP9Y/IMG-20251020-095954-011.jpg", accuracy: "79%" },
    { url: "https://i.postimg.cc/FHF8QN4f/IMG-20251020-100002-472.jpg", accuracy: "86%" },
    { url: "https://i.postimg.cc/25MKvWBg/IMG-20251020-100012-671.jpg", accuracy: "81%" },
    { url: "https://i.postimg.cc/4ybLrF2D/IMG-20251020-100023-691.jpg", accuracy: "87%" },
    { url: "https://i.postimg.cc/vZmqNhrP/IMG-20251020-100033-810.jpg", accuracy: "84%" },
    { url: "https://i.postimg.cc/8cDwBmk3/IMG-20251020-100038-185.jpg", accuracy: "77%" },
    { url: "https://i.postimg.cc/7YKX0zFL/IMG-20251020-100045-990.jpg", accuracy: "89%" },
    { url: "https://i.postimg.cc/ZRzL4xNb/IMG-20251020-100053-162.jpg", accuracy: "76%" },
    { url: "https://i.postimg.cc/9QvdYYJb/IMG-20251020-100113-609.jpg", accuracy: "91%" }
  ],
  medium: [
    { url: "https://i.postimg.cc/JnJPX4J6/IMG-20251020-104414-537.jpg", accuracy: "85%" },
    { url: "https://i.postimg.cc/ZnHPP9qJ/IMG-20251020-104430-876.jpg", accuracy: "82%" },
    { url: "https://i.postimg.cc/Z528LzJ2/IMG-20251020-104435-861.jpg", accuracy: "88%" },
    { url: "https://i.postimg.cc/tJ4njBXg/IMG-20251020-104439-671.jpg", accuracy: "83%" },
    { url: "https://i.postimg.cc/dVykwkKH/IMG-20251020-104443-615.jpg", accuracy: "87%" },
    { url: "https://i.postimg.cc/MHHH4XDw/IMG-20251020-104452-202.jpg", accuracy: "84%" },
    { url: "https://i.postimg.cc/6pn3FkdL/IMG-20251020-104458-282.jpg", accuracy: "86%" },
    { url: "https://i.postimg.cc/85PzJsqD/IMG-20251020-104509-839.jpg", accuracy: "81%" },
    { url: "https://i.postimg.cc/bN2N27Vm/IMG-20251020-104521-438.jpg", accuracy: "89%" },
    { url: "https://i.postimg.cc/0NZ8sPrV/IMG-20251020-104526-899.jpg", accuracy: "85%" },
    { url: "https://i.postimg.cc/T2KWCHHs/IMG-20251020-104532-810.jpg", accuracy: "82%" },
    { url: "https://i.postimg.cc/ZqYW3fdX/IMG-20251020-104537-998.jpg", accuracy: "88%" },
    { url: "https://i.postimg.cc/wxR7hR7w/IMG-20251020-104543-014.jpg", accuracy: "83%" },
    { url: "https://i.postimg.cc/3x1RKgcx/IMG-20251020-104615-327.jpg", accuracy: "87%" }
  ],
  hard: [
    { url: "https://i.postimg.cc/4N8qsy1c/IMG-20251020-105355-761.jpg", accuracy: "85%" },
    { url: "https://i.postimg.cc/tJ4njBXg/IMG-20251020-104439-671.jpg", accuracy: "82%" },
    { url: "https://i.postimg.cc/8cpXVgJ4/IMG-20251020-105410-692.jpg", accuracy: "88%" },
    { url: "https://i.postimg.cc/HsLvZH1t/IMG-20251020-105415-479.jpg", accuracy: "83%" },
    { url: "https://i.postimg.cc/90gb5RH8/IMG-20251020-105424-630.jpg", accuracy: "87%" },
    { url: "https://i.postimg.cc/HL12g1F1/IMG-20251020-105428-916.jpg", accuracy: "84%" },
    { url: "https://i.postimg.cc/hjpbTzvJ/IMG-20251020-105436-994.jpg", accuracy: "86%" },
    { url: "https://i.postimg.cc/RVj17zSJ/IMG-20251020-105443-517.jpg", accuracy: "81%" },
    { url: "https://i.postimg.cc/bJN1yygc/IMG-20251020-105450-320.jpg", accuracy: "89%" },
    { url: "https://i.postimg.cc/DfSBL6Q8/IMG-20251020-105458-348.jpg", accuracy: "85%" },
    { url: "https://i.postimg.cc/zDHFVB5B/IMG-20251020-105512-639.jpg", accuracy: "82%" }
  ],
  hardcore: [
    { url: "https://i.postimg.cc/NMcBmFVb/IMG-20251020-110213-026.jpg", accuracy: "85%" },
    { url: "https://i.postimg.cc/xjgnN0P6/IMG-20251020-110218-479.jpg", accuracy: "82%" },
    { url: "https://i.postimg.cc/FsBvGD8p/IMG-20251020-110222-741.jpg", accuracy: "88%" },
    { url: "https://i.postimg.cc/RVj17zSJ/IMG-20251020-105443-517.jpg", accuracy: "83%" },
    { url: "https://i.postimg.cc/pTRMy75V/IMG-20251020-110240-031.jpg", accuracy: "87%" },
    { url: "https://i.postimg.cc/VvZxGkGs/IMG-20251020-110255-468.jpg", accuracy: "84%" }
  ]
};

// 1Win Postback
app.get('/lwin-postback', (req, res) => {
  const { player_id, status, amount } = req.query;
  
  if (status === 'registration') {
    postbackData.registrations[player_id] = { player_id, status: 'registered', deposited: false };
  } else if (status === 'fdp') {
    postbackData.deposits[player_id] = { player_id, status: 'deposited', amount };
    if (postbackData.registrations[player_id]) {
      postbackData.registrations[player_id].deposited = true;
    }
  }
  
  res.json({ success: true, player_id, status });
});

// Webhook for Telegram
app.post('/webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Set webhook
bot.setWebHook(`${VERCEL_URL}/webhook`);

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();
  
  if (!users[userId]) {
    users[userId] = {
      id: userId,
      language: 'en',
      registered: false,
      deposited: false,
      playerId: null,
      predictionsUsed: 0
    };
    stats.total++;
  }

  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: `${languages.en.flag} ${languages.en.name}`, callback_data: 'lang_en' }],
        [{ text: `${languages.hi.flag} ${languages.hi.name}`, callback_data: 'lang_hi' }],
        [{ text: `${languages.bn.flag} ${languages.bn.name}`, callback_data: 'lang_bn' }],
        [{ text: `${languages.ur.flag} ${languages.ur.name}`, callback_data: 'lang_ur' }],
        [{ text: `${languages.ne.flag} ${languages.ne.name}`, callback_data: 'lang_ne' }]
      ]
    }
  };

  bot.sendMessage(chatId, languages[users[userId].language].selectLanguage, options);
});

// Handle callbacks
bot.on('callback_query', (callbackQuery) => {
  const msg = callbackQuery.message;
  const data = callbackQuery.data;
  const userId = callbackQuery.from.id.toString();

  if (data.startsWith('lang_')) {
    const lang = data.split('_')[1];
    users[userId].language = lang;
    
    bot.editMessageText(languages[lang].welcome, {
      chat_id: msg.chat.id,
      message_id: msg.message_id
    });

    const registerOptions = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📲 Register", url: AFFILIATE_LINK }],
          [{ text: "🔍 Check Registration", callback_data: 'check_registration' }]
        ]
      }
    };

    bot.sendMessage(msg.chat.id, 
      `${languages[lang].step1}\n\n${languages[lang].mustNew}\n\n${languages[lang].instructions}`, 
      registerOptions
    );
  }
  
  else if (data === 'check_registration') {
    const lang = users[userId].language;
    bot.sendMessage(msg.chat.id, 
      `${languages[lang].enterPlayerId}\n\n${languages[lang].howToFind}`
    );
  }
});

// Home route
app.get('/', (req, res) => {
  res.json({ 
    status: '🚀 Chicken Predictor Bot is RUNNING!',
    stats: stats,
    postbackStats: {
      registrations: Object.keys(postbackData.registrations).length,
      deposits: Object.keys(postbackData.deposits).length
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Bot deployed successfully on port ${PORT}`);
});

module.exports = app;
