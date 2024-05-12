import TelegramBot from 'node-telegram-bot-api';

class TelegramChatBot {
    constructor(token) {
        this.bot = new TelegramBot(token, { polling: true });
    }

    // Method to handle '/summary' command
    handleSummaryCommand() {
        this.bot.onText(/\/summary (.+)/, (msg, match) => {
            const chatId = msg.chat.id;
            const resp = match[1]; // the captured "whatever"
            this.bot.sendMessage(chatId, resp);
        });
    }

    // Method to listen for any kind of message
    handleMessage() {
        this.bot.on('message', (msg) => {
            const chatId = msg.chat.id;
            this.bot.sendMessage(chatId, 'Received your message');
        });
    }
}

export default TelegramChatBot;
