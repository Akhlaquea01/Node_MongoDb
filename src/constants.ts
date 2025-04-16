export const DB_NAME = "Node_Tutorial"
export const PROMPT_GET_TXNS_JSON = `Extract transactions from the following text data and convert them into structured JSON format.
                
                Assign:
                - "accountId": "1"
                - "userId": "1"
                - "categoryId": Determine category intelligently based on the description. If unsure, assign "other".
                
                The expected JSON format:
                {
                    "transactions": [
                        {
                            "userId": "1",
                            "accountId": "1",
                            "transactionType": "expense",
                            "amount": 100.00,
                            "categoryId": "CATEGORY_ID",
                            "description": "Bought groceries",
                            "tags": ["food", "monthly"],
                            "isRecurring": false,
                            "location": "Supermarket",
                            "sharedWith": ["1"]
                        },
                        {
                            "userId": "1",
                            "accountId": "1",
                            "transactionType": "income",
                            "amount": 1500.00,
                            "categoryId": "CATEGORY_ID",
                            "description": "Salary",
                            "tags": ["salary", "monthly"],
                            "isRecurring": true,
                            "location": "Office",
                            "sharedWith": []
                        }
                    ]
                }

                Data to process:
                {{data}}
                `
export const ANALYZE_MONTHLY_TRANSACTION_DATA = `
You are a personal finance assistant helping a user understand their spending and earnings over a specified date range.

Here is the user's transaction data in JSON format. Each transaction contains detailed information such as amount, type (credit or debit), category, date, tags, account type, and whether it is recurring.

Analyze the data and return a structured JSON object titled “Where Your Money Went” that includes the following fields:

{
  "summary": {
    "totalIncome": number,
    "totalExpenses": number,
    "netSavings": number
  },
  "spendingBreakdown": {
    "topCategories": [
      { "category": string, "amount": number, "percentage": number }
    ],
    "impulsivePatterns": string[]
  },
  "incomeBreakdown": {
    "sources": [
      { "category": string, "amount": number }
    ],
    "recurringIncome": string[]
  },
  "accountUsage": {
    "byAccount": [
      { "accountType": string, "amount": number }
    ],
    "imbalances": string[]
  },
  "spendingBehavior": {
    "highSpendingDays": string[],
    "weekendSpendingNotes": string[]
  },
  "savingsSuggestions": {
    "cutDown": string[],
    "subscriptionsReview": string
  },
  "comparison": {
    "hasComparison": boolean,
    "notes": string
  },
  "recommendations": string[]
}

Avoid markdown or natural prose formatting. All explanations or suggestions must be in proper JSON fields under their respective categories.

Here is the transaction data:

<INSERT_JSON_HERE>
`

export const AI_DRIVEN_SMART_SUGGESTIONS = `
You are an intelligent financial assistant. Based on the user's transaction history in JSON format, analyze their financial behavior and return personalized insights to help them:

- Save more money
- Avoid unnecessary or impulsive spending
- Improve budgeting
- Optimize account usage
- Understand recurring or spike patterns

Return your results as a **structured JSON object** using the following format:

{
  "smartSuggestions": [
    "Actionable tip 1",
    "Actionable tip 2",
    "Actionable tip 3"
  ],
  "spendingPatternsDetected": [
    "Weekend/high-day spending pattern",
    "Multiple transactions in short time",
    "Any notable trend or spike"
  ],
  "recurringTransactionsReview": {
    "unmarkedRecurringTransactions": [
      "Possible recurring transaction that is not tagged"
    ],
    "actualRecurringTransactions": [
      "Proper recurring transaction detected"
    ]
  },
  "accountOptimization": [
    "Observation or suggestion about account usage"
  ]
}

- Each item in arrays should be a short, clear sentence with specific insight.
- Emojis are allowed to enhance readability (e.g., 💸, 📅, ⚠️, 🧾).
- Avoid any markdown or natural language paragraphs — return only pure JSON.

Here is the transaction data:

<INSERT_JSON_HERE>
`
