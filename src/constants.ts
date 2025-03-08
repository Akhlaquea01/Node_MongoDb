export const DB_NAME = "Node_Tutorial"
export const PROMPT_GET_TXNS_JSON= `Extract transactions from the following text data and convert them into structured JSON format.
                
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