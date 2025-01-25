const RecurringTransactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    name: { type: String, required: true }, // Subscription name (e.g., Netflix)
    amount: { type: Number, required: true },
    frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly", "yearly"],
        required: true,
    },
    nextDueDate: { type: Date, required: true }, // Next payment date
    paymentMethod: { type: String, default: null }, // e.g., card, UPI, wallet
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("RecurringTransaction", RecurringTransactionSchema);
