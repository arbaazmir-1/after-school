//this function is to catch any error in the async functions, this function will check the async funtion for errors
//and return it to the error handling middle ware
module.exports = func => {
    return (req, res, next) => {
        func(req, res, next).catch(next);
    }
}