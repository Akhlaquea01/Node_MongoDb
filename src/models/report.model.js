const ReportSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    reportType: {
        type: String,
        enum: ["monthly", "yearly"],
        required: true,
    },
    data: { type: mongoose.Schema.Types.Mixed, required: true }, // Store report data
    generatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Report", ReportSchema);
