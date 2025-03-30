import TelegramBot from 'node-telegram-bot-api';

class TelegramChatBot {
    private bot: TelegramBot;

    constructor(token) {
        this.bot = new TelegramBot(token, { polling: true });
    }

    // Method to handle '/summary' command
    handleSummaryCommand() {
        this.bot.onText(/\/summary(?: (.+))?/, async (msg, match) => {
            const chatId = msg.chat.id;
            const resp = match[1] ? match[1] : "No summary provided.";
            try {
                await this.bot.sendMessage(chatId, resp);
            } catch (error) {
                console.error("Error sending message:", error);
            }
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
