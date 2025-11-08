/**
 * Generic API response class that provides a standardized structure for API responses
 * @template T - The type of data being returned in the response
 */
class ApiResponse<T = unknown> {
    readonly statusCode: number;
    readonly data: T;
    readonly message: string;
    readonly error: Error | undefined;
    readonly success: boolean;

    constructor(
        statusCode: number,
        data: T,
        message: string = "Success",
        error?: Error
    ) {
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.error = error;
        this.success = statusCode < 400;
    }

    /**
     * Creates a successful API response
     * @param data - The response data
     * @param message - Optional success message
     * @returns A new ApiResponse instance
     */
    static success<T>(data: T, message: string = "Success"): ApiResponse<T> {
        return new ApiResponse<T>(200, data, message);
    }

    /**
     * Creates an error API response
     * @param error - The error object
     * @param statusCode - HTTP status code
     * @param message - Optional error message
     * @returns A new ApiResponse instance
     */
    static error(
        error: Error,
        statusCode: number = 500,
        message: string = "Error"
    ): ApiResponse<never> {
        return new ApiResponse<never>(statusCode, null as never, message, error);
    }

    /**
     * Converts the response to a plain object
     * @returns A plain object representation of the response
     */
    toJSON(): {
        statusCode: number;
        data: T;
        message: string;
        error?: string | { message: string; name: string };
        success: boolean;
    } {
        return {
            statusCode: this.statusCode,
            data: this.data,
            message: this.message,
            error: this.error ? {
                message: this.error.message,
                name: this.error.name
            } : undefined,
            success: this.success,
        };
    }
}

export { ApiResponse };