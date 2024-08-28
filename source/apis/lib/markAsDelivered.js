var utils = require("../utils");

module.exports = function (http, apis, ctx) {
    return function markAsDelivered(threadID, messageID, callback) {
        var pCallback;
        var returnPromise = new Promise(function (resolve, reject) {
            pCallback = error => error ? reject(error) : resolve();
        });

        if (typeof callback !== "function") callback = pCallback;
        if (threadID && messageID) {
            var form = {}
            form["message_ids[0]"] = messageID;
            form["thread_ids[" + threadID + "][0]"] = messageID;

            http
                .post("https://www.facebook.com/ajax/mercury/delivery_receipts.php", ctx.jar, form)
                .then(utils.parseAndCheckLogin(ctx, http))
                .then(function (resData) {
                    if (resData.error)
                        throw resData;

                    return callback();
                })
                .catch(function (error) {
                    if (error.type === "logout.")
                        ctx.isLogin = false;
                    return callback(error);
                });
        } else
            callback("Error: messageID or threadID is not defined");

        return returnPromise;
    }
}
