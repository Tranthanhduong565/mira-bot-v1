module.exports = function (http, apis, ctx) {
    return function getCurrentUserID() {
        return ctx.userID;
    }
}