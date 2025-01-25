const InvestmentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    type: {
        type: String,
        enum: ["stocks", "crypto", "mutual funds", "PPF", "APY", "bonds"],
        required: true,
    },
    name: { type: String, required: true }, // Stock name, Crypto symbol, etc.
    amountInvested: { type: Number, required: true },
    currentValue: { type: Number, required: true },
    dateOfInvestment: { type: Date, required: true },
    lastUpdated: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Investment", InvestmentSchema);
