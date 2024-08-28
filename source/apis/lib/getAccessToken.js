var utils = require("../utils");

module.exports = function (http, apis, ctx) {
    return function getAccessToken(callback) {
        var pCallback;
        var returnPromise = new Promise(function (resolve, reject) {
            pCallback = (error, token) => error ? reject(error) : resolve(token);
        });

        if (typeof callback !== "function")
            callback = pCallback;

        if (ctx.token) {
            var qs = {
                access_token: ctx.token
            }
            utils
                .get("https://graph.facebook.com/me/permissions", ctx.jar, qs)
                .then(function () {
                    return callback(null, ctx.token);
                })
                .catch(function () {
                    return utils
                        .getDTSGInitData(ctx)
                        .then(function () {
                            return utils
                                .post("https://www.facebook.com/v1.0/dialog/oauth/confirm", ctx.jar, {
                                    fb_dtsg: ctx.fb_dtsg,
                                    app_id: "124024574287414",
                                    redirect_uri: "fbconnect://success",
                                    display: "popup",
                                    return_format: "access_token",
                                });
                        })
                        .then(function (res) {
                            var body = res.body;
                            var token = body.match(/access_token=(.*?)&/);
                            if (token && token[1])
                                ctx.token = token[1];
                            else
                                throw new Error("Token is undefined.");

                            return callback(null, ctx.token);
                        })
                        .catch(function (error) {
                            console.log(error);
                            return callback(error);
                        });
                });
        } else {
            utils
                .getDTSGInitData(ctx)
                .then(function () {
                    return utils
                        .post("https://www.facebook.com/v1.0/dialog/oauth/confirm", ctx.jar, {
                            fb_dtsg: ctx.fb_dtsg,
                            app_id: "124024574287414",
                            redirect_uri: "fbconnect://success",
                            display: "popup",
                            return_format: "access_token",
                        });
                })
                .then(function (res) {
                    var body = res.body;
                    var token = body.match(/access_token=(.*?)&/);
                    if (token && token[1])
                        ctx.token = token[1];
                    else
                        throw new Error("Token is undefined.");

                    return callback(null, ctx.token);
                })
                .catch(function (error) {
                    console.log(error);
                    return callback(error);
                });
        }

        return returnPromise;
    }
}