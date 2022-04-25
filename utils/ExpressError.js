//this is the default error handler of expressjs
const { Error } = require("mongoose");

class ExpressError extends Error {
    constructor(message, status) {
        super();
        this.message = message;
        this.status = status;
    }
}
module.exports = ExpressError;