class ApiResponse {
    constructor(statusCode, data, message = "Success", error = undefined) {
        this.statusCode = statusCode;
        this.data = data;
        this.error = error
        this.message = message;
        this.success = statusCode < 400;
    }
}

export { ApiResponse };