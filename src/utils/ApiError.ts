interface ApiErrorResponse {
    statusCode: number;
    message: string;
    data: unknown | null;
    success: boolean;
    errors: unknown[];
}

class ApiError extends Error implements ApiErrorResponse {
    public readonly statusCode: number;
    public readonly data: unknown | null;
    public readonly success: boolean;
    public readonly errors: unknown[];

    constructor(
        statusCode: number,
        message: string = "Something went wrong",
        errors: unknown[] = [],
        stack: string = ""
    ) {
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.message = message;
        this.success = false;
        this.errors = errors;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    public toJSON(): ApiErrorResponse {
        return {
            statusCode: this.statusCode,
            message: this.message,
            data: this.data,
            success: this.success,
            errors: this.errors
        };
    }
}

export { ApiError, ApiErrorResponse };