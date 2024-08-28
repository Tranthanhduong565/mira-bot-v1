var utils = require("../utils");

module.exports = function (http, apis, ctx) {
    return function logout(callback) {
        var pCallback;
        var returnPromise = new Promise(function (resolve, reject) {
            pCallback = error => error ? reject(error) : resolve();
        });

        if (typeof callback !== "function")
            callback = pCallback

        var form = {
            pmid: "0"
        }

        http
            .post("https://www.facebook.com/bluebar/modern_settings_menu/?help_type=364455653583099&show_contextual_help=1", ctx.jar, form)
            .then(utils.parseAndCheckLogin(ctx, http))
            .then(function (res) {
                var elem = res.jsmods.instances[0][2][0].filter(item => item.value === "logout")[0];
                var body = res.jsmods.markup.filter(item => item[0] === elem.markup.__m)[0][1].__html;
                var match = [...body.matchAll(/<input[^>]*name="([^"]+)"[^>]*value="([^"]+)"[^>]*>/g)].map(item => item[2]);
                var form = {
                    jazoest: match[0],
                    fb_dtsg: match[1],
                    ref: match[2],
                    h: match[3]
                }

                return http.post("https://www.facebook.com/logout.php", ctx.jar, form);
            })
            .then(function (res) {
                if (!res.headers)
                    throw {
                        error: "An error occurred when logging out."
                    }

                return http.get(res.headers.location, ctx.jar);
            })
            .then(function () {
                ctx.isLogin = false;
                return callback();
            })
            .catch(function (error) {
                if (error.type === "logout.")
                    ctx.isLogin = false;
                return callback(error);
            });

        return returnPromise;
    }
}