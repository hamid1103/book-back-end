class ForbiddenError extends Error {
    statusCode = 403;
    constructor(message: string) {
        super(message);
        this.name = "ForbiddenError";
    }
}

export default ForbiddenError;
