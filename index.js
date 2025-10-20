const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
app.use(express.json());

// Environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const VERCEL_URL = process.env.VERCEL_URL;
const AFFILIATE_LINK = process.env.AFFILIATE_LINK || 'https://mostbet-king.com/5rTs';

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

// Storage
let users = {};
let stats = { total: 0, registered: 0, deposited: 0 };
let postbackData = { registrations: {}, deposits: {}, approvedDeposits: {} };

// ALL 5 LANGUAGES
const languages = {
  en: {
    name: "English", flag: "🇺🇸",
    welcome: "✅ You selected English!",
    selectLanguage: "Select your preferred language:",
    step1: "🌐 Step 1 - Register", mustNew: "‼️ THE ACCOUNT MUST BE NEW",
    instructions: `1️⃣ If after clicking "REGISTER" you get old account, logout and click again\n\n2️⃣ Use promocode: CLAIM\n\n3️⃣ Deposit minimum 600₹ or 6$`,
    enterPlayerId: "Please enter your Mostbet Player ID to verify:",
    howToFind: "📝 How to find Player ID:\n1. Login to Mostbet\n2. Go to Profile Settings\n3. Copy Player ID\n4. Paste here",
    congratulations: "Congratulations! Select Your Game Mode:",
    notRegistered: "❌ You're Not Registered!\nClick REGISTER first and complete registration.",
    registeredNoDeposit: `🎉 Registration Complete!\n✅ Account synchronized\n💴 Deposit at least 600₹ or $6 for signals\n🕹️ After deposit, click CHECK DEPOSIT`,
    limitReached: "📊 Daily Limit Reached!\n🕐 Try tomorrow or deposit 400₹/4$ to continue",
    checking: "🔍 Checking registration...", verified: "✅ Verified!",
    depositRequired: "💳 Deposit Required", welcomeBack: "👋 Welcome back!"
  },
  hi: {
    name: "हिंदी", flag: "🇮🇳",
    welcome: "✅ आपने हिंदी चुनी!",
    selectLanguage: "अपनी भाषा चुनें:",
    step1: "🌐 स्टेप 1 - रजिस्टर करें", mustNew: "‼️ अकाउंट नया होना चाहिए",
    instructions: `1️⃣ अगर पुराना अकाउंट आए तो लॉगआउट कर फिर से क्लिक करें\n\n2️⃣ प्रोमोकोड: CLAIM\n\n3️⃣ न्यूनतम 600₹ या 6$ जमा करें`,
    enterPlayerId: "अपना Player ID दर्ज करें:",
    howToFind: "📝 Player ID ढूंढें:\n1. Mostbet में लॉगिन\n2. प्रोफाइल सेटिंग\n3. Player ID कॉपी\n4. यहाँ पेस्ट",
    congratulations: "बधाई! गेम मोड चुनें:",
    notRegistered: "❌ आप रजिस्टर्ड नहीं!\nपहले REGISTER क्लिक करें",
    registeredNoDeposit: `🎉 रजिस्ट्रेशन पूरा!\n✅ अकाउंट सिंक हुआ\n💴 सिग्नल के लिए 600₹ या $6 जमा करें\n🕹️ जमा के बाद CHECK DEPOSIT क्लिक करें`,
    limitReached: "📊 दैनिक सीमा पूरी!\n🕐 कल कोशिश करें या 400₹/4$ जमा करें",
    checking: "🔍 जांच हो रही...", verified: "✅ सत्यापित!",
    depositRequired: "💳 जमा आवश्यक", welcomeBack: "👋 वापसी पर स्वागत!"
  },
  bn: {
    name: "বাংলা", flag: "🇧🇩",
    welcome: "✅ আপনি বাংলা নির্বাচন করেছেন!",
    selectLanguage: "আপনার ভাষা নির্বাচন করুন:",
    step1: "🌐 ধাপ 1 - নিবন্ধন", mustNew: "‼️ অ্যাকাউন্ট নতুন হতে হবে",
    instructions: `1️⃣ পুরানো অ্যাকাউন্ট আসলে লগআউট করে আবার ক্লিক করুন\n\n2️⃣ প্রমোকোড: CLAIM\n\n3️⃣ ন্যূনতম 600₹ বা 6$ জমা করুন`,
    enterPlayerId: "আপনার Player ID লিখুন:",
    howToFind: "📝 Player ID খুঁজুন:\n1. Mostbet এ লগইন\n2. প্রোফাইল সেটিংস\n3. Player ID কপি\n4. এখানে পেস্ট",
    congratulations: "অভিনন্দন! গেম মোড নির্বাচন করুন:",
    notRegistered: "❌ আপনি নিবন্ধিত নন!\nপ্রথমে REGISTER ক্লিক করুন",
    registeredNoDeposit: `🎉 নিবন্ধন সম্পূর্ণ!\n✅ অ্যাকাউন্ট সিঙ্ক\n💴 সিগন্যালের জন্য 600₹ বা $6 জমা\n🕹️ জমার পর CHECK DEPOSIT ক্লিক`,
    limitReached: "📊 দৈনিক সীমা শেষ!\n🕐 আগামীকাল চেষ্টা বা 400₹/4$ জমা",
    checking: "🔍 পরীক্ষা করা হচ্ছে...", verified: "✅ যাচাইকৃত!",
    depositRequired: "💳 জমা প্রয়োজন", welcomeBack: "👋 ফিরে আসার স্বাগতম!"
  },
  ur: {
    name: "اردو", flag: "🇵🇰",
    welcome: "✅ آپ نے اردو منتخب کی!",
    selectLanguage: "اپنی زبان منتخب کریں:",
    step1: "🌐 مرحلہ 1 - رجسٹر", mustNew: "‼️ اکاؤنٹ نیا ہونا چاہیے",
    instructions: `1️⃣ پرانا اکاؤنٹ آئے تو لاگ آؤٹ کر کے دوبارہ کلک\n\n2️⃣ پروموکوڈ: CLAIM\n\n3️⃣ کم از کم 600₹ یا 6$ جمع`,
    enterPlayerId: "اپنا Player ID درج:",
    howToFind: "📝 Player ID ڈھونڈیں:\n1. Mostbet لاگ ان\n2. پروفائل سیٹنگ\n3. Player ID کاپی\n4. یہاں پیسٹ",
    congratulations: "مبارک! گیم موڈ منتخب:",
    notRegistered: "❌ آپ رجسٹرڈ نہیں!\nپہلے REGISTER کلک",
    registeredNoDeposit: `🎉 رجسٹریشن مکمل!\n✅ اکاؤنٹ sync\n💴 سگنل کے لیے 600₹ یا $6 جمع\n🕹️ جمع کے بعد CHECK DEPOSIT کلک`,
    limitReached: "📊 روزانہ حد مکمل!\n🕐 کل کوشش یا 400₹/4$ جمع",
    checking: "🔍 چیک ہو رہا...", verified: "✅ تصدیق!",
    depositRequired: "💳 جمع ضروری", welcomeBack: "👋 واپسی پر خوش آمدید!"
  },
  ne: {
    name: "नेपाली", flag: "🇳🇵",
    welcome: "✅ तपाईंले नेपाली चयन गर्नुभयो!",
    selectLanguage: "आफ्नो भाषा चयन:",
    step1: "🌐 चरण 1 - दर्ता", mustNew: "‼️ खाता नयाँ हुनुपर्छ",
    instructions: `1️⃣ पुरानो खाता आयो भने लगआउट गरेर फेरि क्लिक\n\n2️⃣ प्रोमोकोड: CLAIM\n\n3️⃣ कम्तिमा 600₹ वा 6$ जम्मा`,
    enterPlayerId: "आफ्नो Player ID प्रविष्ट:",
    howToFind: "📝 Player ID खोज:\n1. Mostbet लगइन\n2. प्रोफाइल सेटिङ\n3. Player ID कपी\n4. यहाँ पेस्ट",
    congratulations: "बधाई! खेल मोड चयन:",
    notRegistered: "❌ तपाईं दर्ता गरिएको छैन!\nपहिले REGISTER क्लिक",
    registeredNoDeposit: `🎉 दर्ता पूरा!\n✅ खाता सिङ्क\n💴 सिग्नलको लागि 600₹ वा $6 जम्मा\n🕹️ जम्मा पछि CHECK DEPOSIT क्लिक`,
    limitReached: "📊 दैनिक सीमा पूरा!\n🕐 भोली प्रयास वा 400₹/4$ जम्मा",
    checking: "🔍 जाँच गरिदै...", verified: "✅ सत्यापित!",
    depositRequired: "💳 जम्मा आवश्यक", welcomeBack: "👋 फर्किनुभएकोमा स्वागत!"
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
    console.log(`✅ Registration: ${player_id}`);
  } else if (status === 'fdp') {
    postbackData.deposits[player_id] = { player_id, status: 'deposited', amount };
    if (postbackData.registrations[player_id]) {
      postbackData.registrations[player_id].deposited = true;
    }
    console.log(`💰 Deposit: ${player_id}, Amount: ${amount}`);
  } else if (status === 'fd_approved') {
    postbackData.approvedDeposits[player_id] = { player_id, status: 'approved', amount };
    console.log(`🎉 Approved: ${player_id}, Amount: ${amount}`);
  }
  
  res.json({ success: true, player_id, status });
});

// Player verification
app.get('/verify-player/:playerId', (req, res) => {
  const playerId = req.params.playerId;
  const registration = postbackData.registrations[playerId];
  const deposit = postbackData.deposits[playerId];
  const approved = postbackData.approvedDeposits[playerId];
  
  res.json({
    isRegistered: !!registration,
    hasDeposit: !!deposit,
    isApproved: !!approved,
    registrationData: registration,
    depositData: deposit,
    approvedData: approved
  });
});

// Webhook route
app.post('/webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Setup webhook automatically
async function setupWebhook() {
  try {
    await bot.setWebHook(`${VERCEL_URL}/webhook`);
    console.log('✅ Webhook set:', `${VERCEL_URL}/webhook`);
  } catch (error) {
    console.log('❌ Webhook error:', error.message);
  }
}

// Admin notification
async function sendAdminNotification(message) {
  try {
    await bot.sendMessage(ADMIN_CHAT_ID, 
      `🤖 BOT NOTIFICATION\n${message}\n\n` +
      `📊 STATS: Total: ${stats.total} | Registered: ${stats.registered} | Deposited: ${stats.deposited}`
    );
  } catch (error) {
    console.log('Admin notification failed');
  }
}

// Start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();
  const userName = msg.from.first_name || 'User';
  
  if (!users[userId]) {
    users[userId] = {
      id: userId,
      language: 'en',
      registered: false,
      deposited: false,
      playerId: null,
      predictionsUsed: 0,
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };
    stats.total++;
    await sendAdminNotification(`🆕 NEW USER: ${userName} (${userId})\nTotal: ${stats.total}`);
  } else {
    users[userId].lastActive = new Date().toISOString();
  }

  const lang = users[userId].language;
  
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

  if (users[userId].language !== 'en') {
    bot.sendMessage(chatId, languages[lang].welcomeBack);
  }
  
  bot.sendMessage(chatId, languages[lang].selectLanguage, options);
});

// Handle callbacks
bot.on('callback_query', async (callbackQuery) => {
  const msg = callbackQuery.message;
  const data = callbackQuery.data;
  const userId = callbackQuery.from.id.toString();
  const user = users[userId];
  const lang = user.language;

  try {
    if (data.startsWith('lang_')) {
      const newLang = data.split('_')[1];
      user.language = newLang;
      
      await bot.editMessageText(languages[newLang].welcome, {
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

      await bot.sendMessage(msg.chat.id, 
        `${languages[newLang].step1}\n\n${languages[newLang].mustNew}\n\n${languages[newLang].instructions}`, 
        registerOptions
      );
    }
    
    else if (data === 'check_registration') {
      await bot.sendMessage(msg.chat.id, 
        `${languages[lang].enterPlayerId}\n\n${languages[lang].howToFind}`
      );
    }
    
    else if (data.startsWith('mode_')) {
      const mode = data.split('_')[1];
      user.currentMode = mode;
      user.predictionsUsed = 0;
      
      await sendPrediction(msg.chat.id, userId, mode, 1);
    }
    
    else if (data.startsWith('next_')) {
      const mode = data.split('_')[1];
      user.predictionsUsed++;
      
      if (user.predictionsUsed >= 20) {
        await bot.sendMessage(msg.chat.id, languages[lang].limitReached, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🕐 Try Tomorrow", callback_data: 'try_tomorrow' }],
              [{ text: "💳 Deposit Again", url: AFFILIATE_LINK }]
            ]
          }
        });
      } else {
        await sendPrediction(msg.chat.id, userId, mode, user.predictionsUsed + 1);
      }
    }
    
    else if (data === 'prediction_menu') {
      await bot.sendMessage(msg.chat.id, languages[lang].congratulations, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🎯 Easy", callback_data: 'mode_easy' }],
            [{ text: "⚡ Medium", callback_data: 'mode_medium' }],
            [{ text: "🔥 Hard", callback_data: 'mode_hard' }],
            [{ text: "💀 Hardcore", callback_data: 'mode_hardcore' }]
          ]
        }
      });
    }
    
    else if (data === 'check_deposit') {
      await bot.sendMessage(msg.chat.id, 
        `${languages[lang].enterPlayerId}\n\n${languages[lang].howToFind}`
      );
    }

    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.log('Callback error:', error);
    await bot.answerCallbackQuery(callbackQuery.id, { text: 'Error occurred' });
  }
});

// Send prediction function
async function sendPrediction(chatId, userId, mode, step) {
  const user = users[userId];
  const lang = user.language;
  const modeImages = predictionImages[mode];
  const randomImage = modeImages[Math.floor(Math.random() * modeImages.length)];
  
  try {
    await bot.sendPhoto(chatId, randomImage.url, {
      caption: `👆 BET 👆\n\n("CASH OUT" at this value or before)\nACCURACY:- ${randomImage.accuracy}\n\nStep: ${step}/20`,
      reply_markup: {
        inline_keyboard: [
          [{ text: "➡️ Next", callback_data: `next_${mode}` }],
          [{ text: "📋 Menu", callback_data: 'prediction_menu' }]
        ]
      }
    });
  } catch (error) {
    await bot.sendMessage(chatId, `🎯 ${mode.toUpperCase()} Prediction ${step}/20\nAccuracy: ${randomImage.accuracy}\n\nStep: ${step}/20`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "➡️ Next", callback_data: `next_${mode}` }],
          [{ text: "📋 Menu", callback_data: 'prediction_menu' }]
        ]
      }
    });
  }
}

// Handle player ID input
bot.on('message', async (msg) => {
  if (msg.text && /^\d+$/.test(msg.text)) {
    const userId = msg.from.id.toString();
    const playerId = msg.text;
    const user = users[userId];
    const lang = user.language;
    
    user.playerId = playerId;
    
    const loadingMsg = await bot.sendMessage(msg.chat.id, languages[lang].checking);
    
    try {
      // Verify player with postback data
      const registration = postbackData.registrations[playerId];
      const deposit = postbackData.deposits[playerId];
      
      await bot.deleteMessage(msg.chat.id, loadingMsg.message_id);
      
      if (registration && deposit) {
        // Registered and deposited
        if (!user.registered) {
          user.registered = true;
          user.deposited = true;
          stats.registered++;
          stats.deposited++;
          await sendAdminNotification(`✅ VERIFIED: ${userId}\nPlayer: ${playerId}\nDeposit: ${deposit.amount || 'N/A'}`);
        }
        
        await bot.sendMessage(msg.chat.id, `${languages[lang].verified}\n\n${languages[lang].congratulations}`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🎯 Easy", callback_data: 'mode_easy' }],
              [{ text: "⚡ Medium", callback_data: 'mode_medium' }],
              [{ text: "🔥 Hard", callback_data: 'mode_hard' }],
              [{ text: "💀 Hardcore", callback_data: 'mode_hardcore' }]
            ]
          }
        });
      } else if (registration && !deposit) {
        // Registered but no deposit
        if (!user.registered) {
          user.registered = true;
          stats.registered++;
        }
        
        await bot.sendMessage(msg.chat.id, languages[lang].registeredNoDeposit, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "💳 Deposit", url: AFFILIATE_LINK }],
              [{ text: "🔍 Check Deposit", callback_data: 'check_deposit' }]
            ]
          }
        });
      } else {
        // Not registered
        await bot.sendMessage(msg.chat.id, languages[lang].notRegistered, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "📲 Register Now", url: AFFILIATE_LINK }]
            ]
          }
        });
      }
    } catch (error) {
      await bot.deleteMessage(msg.chat.id, loadingMsg.message_id);
      await bot.sendMessage(msg.chat.id, "❌ Verification failed. Please try again.");
    }
  }
});

// Daily motivational messages
cron.schedule('0 9 * * *', async () => {
  const messages = {
    en: "🚀 Don't miss today's winning predictions! Use /start now!",
    hi: "🚀 आज की जीतने वाली भविष्यवाणियाँ मत छोड़ें! /start अभी!",
    bn: "🚀 আজকের জয়ের ভবিষ্যতবাণী মিস করবেন না! /start এখন!",
    ur: "🚀 آج کی جیتنے والی پیشن گوئیوں کو مت چھوڑیں! /start ابھی!",
    ne: "🚀 आजका जित्ने भविष्यवाणीहरू नछोड्नुहोस्! /start अहिले!"
  };
  
  for (const userId in users) {
    try {
      const lang = users[userId].language;
      await bot.sendMessage(userId, messages[lang] || messages.en, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🎯 Get Predictions", callback_data: 'get_predictions' }]
          ]
        }
      });
    } catch (error) {
      // User might have blocked the bot
      delete users[userId];
    }
  }
});

// Manual webhook setup
app.get('/setup-webhook', async (req, res) => {
  try {
    await bot.setWebHook(`${VERCEL_URL}/webhook`);
    res.json({ success: true, message: 'Webhook set successfully' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Stats endpoint
app.get('/stats', (req, res) => {
  res.json({
    botStats: stats,
    postbackStats: {
      registrations: Object.keys(postbackData.registrations).length,
      deposits: Object.keys(postbackData.deposits).length,
      approved: Object.keys(postbackData.approvedDeposits).length
    },
    userStats: {
      total: Object.keys(users).length,
      registered: Object.values(users).filter(u => u.registered).length,
      deposited: Object.values(users).filter(u => u.deposited).length
    }
  });
});

// Home route
app.get('/', (req, res) => {
  res.json({ 
    status: '🚀 Chicken Predictor Bot - FULLY WORKING!',
    features: [
      '5 Languages Support',
      '1Win Postback Integration', 
      '4 Game Modes',
      'Daily Predictions',
      'Admin Notifications',
      'Player Verification'
    ],
    urls: {
      webhook: `${VERCEL_URL}/webhook`,
      postback: `${VERCEL_URL}/lwin-postback`,
      stats: `${VERCEL_URL}/stats`,
      setup: `${VERCEL_URL}/setup-webhook`
    }
  });
});

// Initialize
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`✅ Chicken Predictor Bot running on port ${PORT}`);
  await setupWebhook();
});

module.exports = app;
