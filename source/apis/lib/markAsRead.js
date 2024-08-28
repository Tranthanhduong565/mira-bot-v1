var utils = require("../utils");

module.exports = function (http, apis, ctx) {
    return function markAsRead(threadID, read = true, callback) {
        var pCallback;
        var returnPromise = new Promise(function (resolve, reject) {
            pCallback = error => error ? reject(error) : resolve();
        });

        if (typeof read === "function") {
            callback = read;
            read = true;
        }

        if (typeof callback !== "function")
            callback = pCallback;

        var form = {}
        form["source"] = "PagesManagerMessagesInterface";
        form["request_user_id"] = ctx.userID;
        form["ids[" + threadID + "]"] = read;
        form["watermarkTimestamp"] = new Date().getTime();
        form["shouldSendReadReceipt"] = true;
        form["commerce_last_message_type"] = "";

        http
            .post("https://www.facebook.com/ajax/mercury/change_read_status.php", ctx.jar, form)
            .then(utils.parseAndCheckLogin(ctx, http))
            .then(function () {
                return callback();
            })
            .catch(function (error) {
                if (error.type === "logout.") 
                    ctx.isLogin = false;

                return callback(error);
            })

        return returnPromise;
    }
}