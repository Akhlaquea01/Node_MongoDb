class ApiResponse {
    statusCode: number;
    data: any;
    message: string;
    error: any;
    success: boolean;

    constructor(statusCode: number, data: any, message = "Success", error: any = undefined) {
        this.statusCode = statusCode;
        this.data = data;
        this.error = error
        this.message = message;
        this.success = statusCode < 400;
    }
}

export { ApiResponse };