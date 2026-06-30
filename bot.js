const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const pendingUsers = {};

// User sends /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    '👋 Welcome! Please share your phone number so we can give you access to our website.',
    {
      reply_markup: {
        keyboard: [[{ text: '📱 Share My Number', request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    }
  );
});

// User shares phone number
bot.on('contact', (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const phone = msg.contact.phone_number;
  const name = msg.from.first_name;

  pendingUsers[userId] = { chatId, phone, name };

  // Tell user to wait
  bot.sendMessage(chatId,
    '✅ Thank you! Please wait a few seconds, we will get back to you with your access details shortly. 🕐',
    { reply_markup: { remove_keyboard: true } }
  );

  // Notify you (admin)
  bot.sendMessage(ADMIN_CHAT_ID,
    `🆕 New Request!\n\n👤 Name: ${name}\n📱 Phone: ${phone}\n🆔 User ID: ${userId}\n\nReply with:\n/send ${userId} username password`
  );
});

// You send credentials: /send <userId> <username> <password>
bot.onText(/\/send (\d+) (\S+) (\S+)/, (msg, match) => {
  if (msg.chat.id.toString() !== ADMIN_CHAT_ID.toString()) return;

  const targetUserId = match[1];
  const username = match[2];
  const password = match[3];

  const user = pendingUsers[targetUserId];
  if (!user) {
    bot.sendMessage(ADMIN_CHAT_ID, '❌ User not found.');
    return;
  }

  bot.sendMessage(user.chatId,
    `🎉 Your account is ready!\n\n👤 Username: ${username}\n🔑 Password: ${password}\n\nEnjoy! 🚀`
  );

  bot.sendMessage(ADMIN_CHAT_ID, `✅ Credentials sent to ${user.name}`);
  delete pendingUsers[targetUserId];
});