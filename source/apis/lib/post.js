var utils = require("../utils");

module.exports = function (http, apis, ctx) {
    return function HttpClientPostData(url, form, parse = false, callback) {
        var pCallback;
        var returnPromise = new Promise(function (resolve, reject) {
            pCallback = error => error ? reject(error) : resolve();
        });

        return returnPromise;
    }
}