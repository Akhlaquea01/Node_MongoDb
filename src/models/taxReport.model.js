const TaxReportSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    year: { type: Number, required: true },
    totalIncome: { type: Number, required: true },
    deductibleExpenses: { type: Number, required: true },
    taxesPaid: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("TaxReport", TaxReportSchema);
