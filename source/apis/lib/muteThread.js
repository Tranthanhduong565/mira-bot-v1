var utils = require("../utils");

module.exports = function (http, apis, ctx) {
    return function muteThread(threadID, muteSeconds = 0, callback) {
        var pCallback;
        var returnPromise = new Promise(function (resolve, reject) {
            pCallback = error => error ? reject(error) : resolve();
        });

        if (typeof threadID === "function") {
            callback = threadID;
            threadID = null;
        }
        if (typeof muteSeconds === "function") {
            callback = muteSeconds;
            muteSeconds = 0;
        }
        if (typeof callback !== "function")
            callback = pCallback;
        if (utils.getType(threadID) !== "String" || utils.getType(threadID) !== "Number")
            callback(new Error("threadID must be an string number"));
        else if (utils.getType(muteSeconds) !== "String" || utils.getType(muteSeconds) !== "Number")
            callback(new Error("muteSeconds must be an string number"));
        else {
            var form = {
                thread_fbid: threadID,
                mute_settings: muteSeconds
            }
    
            http
                .post("https://www.facebook.com/ajax/mercury/change_mute_thread.php", ctx.jar, form)
                .then(utils.parseAndCheckLogin(ctx, http))
                .then(function (res) {
                    if (res.error || res.errors)
                        throw res; 
    
                    return callback();
                })
                .catch(function (error) {
                    if (error.type === "logout.")
                        ctx.isLogin = false;
    
                    return callback(error);
                });
        }

        return returnPromise;
    }
}