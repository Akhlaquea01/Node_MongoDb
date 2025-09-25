import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { getChatResponse } from "../utils/googleAi.js";
import { ANALYZE_MONTHLY_TRANSACTION_DATA, AI_DRIVEN_SMART_SUGGESTIONS } from "../constants.js";
import { Transaction } from "../models/bank.model.js";

/**
 * @description Analyzes monthly transactions using AI to provide insights
 * @route POST /api/v1/ai/analyze-monthly
 * @access Private
 */
const analyzeMonthlyTransactions = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { startDate, endDate } = req.body;

        // Get transactions directly from the model
        const transactions = await Transaction.find({
            userId,
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        }).populate('categoryId', 'name')
          .populate('accountId', 'accountName accountType');

        if (!transactions.length) {
            return res.status(404).json(
                new ApiResponse(404, undefined, "No transactions found for the specified period")
            );
        }

        // Format transactions for AI analysis
        const formattedTransactions = transactions.map(txn => ({
            amount: txn.amount,
            type: txn.transactionType,
            category: txn.categoryId?.name || 'Uncategorized',
            date: txn.date,
            tags: txn.tags,
            accountType: txn.accountId?.accountType,
            description: txn.description
        }));

        // Get AI analysis
        const prompt = ANALYZE_MONTHLY_TRANSACTION_DATA.replace(
            '<INSERT_JSON_HERE>',
            JSON.stringify(formattedTransactions)
        );

        const aiResponse = await getChatResponse(process.env.GOOGLE_GENAI_MODEL, [
            { role: "user", content: prompt }
        ]);

        // Parse the AI response to extract JSON
        const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
        const analysis = jsonMatch ? JSON.parse(jsonMatch[1]) : aiResponse;

        return res.status(200).json(
            new ApiResponse(200, { analysis }, "Monthly transaction analysis completed successfully")
        );
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong while analyzing transactions", error)
        );
    }
});

/**
 * @description Get AI-driven smart suggestions for financial management
 * @route POST /api/v1/ai/smart-suggestions
 * @access Private
 */
const getSmartSuggestions = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { startDate, endDate } = req.body;

        // Get transactions directly from the model
        const transactions = await Transaction.find({
            userId,
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        }).populate('categoryId', 'name')
          .populate('accountId', 'accountName accountType');

        if (!transactions.length) {
            return res.status(404).json(
                new ApiResponse(404, undefined, "No transactions found for the specified period")
            );
        }

        // Format transactions for AI analysis
        const formattedTransactions = transactions.map(txn => ({
            amount: txn.amount,
            type: txn.transactionType,
            category: txn.categoryId?.name || 'Uncategorized',
            date: txn.date,
            tags: txn.tags,
            accountType: txn.accountId?.accountType,
            description: txn.description
        }));

        // Get AI suggestions
        const prompt = AI_DRIVEN_SMART_SUGGESTIONS.replace(
            '<INSERT_JSON_HERE>',
            JSON.stringify(formattedTransactions)
        );

        const aiResponse = await getChatResponse(process.env.GOOGLE_GENAI_MODEL, [
            { role: "user", content: prompt }
        ]);

          // Parse the AI response to extract JSON
          const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
          const suggestions = jsonMatch ? JSON.parse(jsonMatch[1]) : aiResponse;
        return res.status(200).json(
            new ApiResponse(200, { suggestions: suggestions }, "Smart suggestions generated successfully")
        );
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, undefined, "Something went wrong while generating suggestions", error)
        );
    }
});

export { analyzeMonthlyTransactions, getSmartSuggestions }; 