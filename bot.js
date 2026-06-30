const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const pendingUsers = {};

// Keep-alive server
http.createServer((req, res) => {
  res.write('Bot is running!');
  res.end();
}).listen(3000);

// /start command
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

// ✅ Fix 1 — User shares via contact button
bot.on('contact', (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const phone = msg.contact.phone_number;
  const name = msg.from.first_name;

  handleNewUser(chatId, userId, phone, name);
});

// ✅ Fix 2 — User types number manually as text
bot.on('message', (msg) => {
  if (msg.contact || msg.text?.startsWith('/')) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const name = msg.from.first_name;
  const text = msg.text;

  // Check if it looks like a phone number
  if (text && /^[\d\s\+\-]{7,15}$/.test(text)) {
    handleNewUser(chatId, userId, text, name);
  } else {
    bot.sendMessage(chatId, '📱 Please share your phone number using the button below.',
      {
        reply_markup: {
          keyboard: [[{ text: '📱 Share My Number', request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      }
    );
  }
});

function handleNewUser(chatId, userId, phone, name) {
  pendingUsers[userId] = { chatId, phone, name };

  // Tell user to wait
  bot.sendMessage(chatId,
    '✅ Thank you! Please wait a few seconds, we will get back to you with your access details shortly. 🕐',
    { reply_markup: { remove_keyboard: true } }
  );

  // Notify you
  bot.sendMessage(ADMIN_CHAT_ID,
    `🆕 New Request!\n\n👤 Name: ${name}\n📱 Phone: ${phone}\n🆔 User ID: ${userId}\n\nReply with:\n/send ${userId} username password`
  );
}

// Admin sends credentials
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