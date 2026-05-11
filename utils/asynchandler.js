const asynchandler = (handleasync) => {
    return (req, res, next) => {
        Promise.resolve(handleasync(req, res, next)).catch((err) => {
            console.error("Async error:", err);
            next(err);
        });
    }
}

export {asynchandler}