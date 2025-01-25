const DashboardSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    totalIncome: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    netBalance: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }, // For periodic updates
});

module.exports = mongoose.model("Dashboard", DashboardSchema);
