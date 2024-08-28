var request = require("request").defaults({ jar: true });
var parseProxy = proxy => (proxy.match(/^(?:http:\/\/)?(?:(\S+):(\S+)@)?([A-Za-z0-9.-]+):(\d{2,5})$/) || []).slice(1);
var utilsLib = require("../lib/utils");
var log = require("../lib/log");
var stream = require("stream");

function setProxy(proxy) {
    var proxyArray = parseProxy(proxy);

    if (proxyArray)
        request = require("request").defaults({ jar: true, proxy });
    else
        request = require("request").defaults({ jar: true });
}

function setHeaders(url, ctx, customHeaders) {
    var headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: "https://www.facebook.com/",
        Host: new URL(url).hostname,
        Origin: "https://www.facebook.com",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (Kbody, like Gecko) Chrome/127.0.0.0 Safari/537.36",
        Connection: "keep-alive",
        "sec-fetch-site": "same-origin"
    }
    if (customHeaders)
        Object.assign(headers, customHeaders);
    if (customHeaders && customHeaders.noRef) {
        delete headers.Referer;
        delete headers.noRef;
    }
    if (ctx && ctx.region)
        headers["X-MSGR-Region"] = ctx.region;

    return headers;
}

function get(url, jar, qs, ctx, customHeaders) {
    if (utilsLib.getType(qs) === "Object") {
        for (var prop in qs) {
            if (qs.hasOwnProperty(prop) && utilsLib.getType(qs[prop]) === "Object") {
                qs[prop] = JSON.stringify(qs[prop]);
            }
        }
    }
    var options = {
        headers: setHeaders(url, ctx, customHeaders),
        timeout: 60000,
        qs,
        url,
        method: "GET",
        jar,
        gzip: true
    }

    var callback;
    var returnPromise = new Promise(function (resolve, reject) {
        callback = (error, response) => error ? reject(error) : resolve(response);
    });
    request(options, callback);

    return returnPromise;
}

function post(url, jar, form, ctx, customHeaders) {
    var options = {
        headers: setHeaders(url, ctx, customHeaders),
        timeout: 60000,
        url,
        method: "POST",
        form,
        jar,
        gzip: true
    }

    var callback;
    var returnPromise = new Promise(function (resolve, reject) {
        callback = (error, response) => error ? reject(error) : resolve(response);
    });
    request(options, callback);

    return returnPromise;
}

function postData(url, jar, formData, qs, ctx, customHeaders) {
    if (utilsLib.getType(qs) === "Object") {
        for (var prop in qs) {
            if (qs.hasOwnProperty(prop) && utilsLib.getType(qs[prop]) === "Object") {
                qs[prop] = JSON.stringify(qs[prop]);
            }
        }
    }
    var headers = setHeaders(url, ctx, customHeaders);
    headers["Content-Type"] = "multipart/form-data";
    var options = {
        headers,
        timeout: 60000,
        url,
        method: "POST",
        formData,
        qs,
        jar,
        gzip: true
    }

    var callback;
    var returnPromise = new Promise(function (resolve, reject) {
        callback = (error, response) => error ? reject(error) : resolve(response);
    });
    request(options, callback);

    return returnPromise;
}

function isReadableStream(maybeStream) {
    return (maybeStream instanceof stream.Stream && typeof maybeStream._read === "function" && utilsLib.getType(maybeStream._readableState) === "Object");
}

function getGUID() {
    var sectionLength = Date.now();
    var id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = Math.floor((sectionLength + Math.random() * 16) % 16);
        sectionLength = Math.floor(sectionLength / 16);
        var _guid = (c === "x" ? r : (r & 7) | 8).toString(16);
        return _guid;
    });
    return id;
}

function getSignatureID() {
    return Math.floor(Math.random() * 2147483648).toString(16);
}

function makeDefaults(body, userID, ctx) {
    var reqCounter = 1;
    var fb_dtsg = /\["DTSGInitData",\[],{"token":"(\S+)","async_get_token"/g.exec(body)[1];
    var revision = /"server_revision":(\d+)/g.exec(body)[1];

    function mergeWithDefaults(Obj) {
        fb_dtsg = ctx.fb_dtsg ? ctx.fb_dtsg : fb_dtsg
        var ttstamp = "2";
        for (var i = 0; i < fb_dtsg.length; i++) {
            ttstamp += fb_dtsg.charCodeAt(i);
        }
        var newObj = {
            av: userID,
            __user: userID,
            __req: (reqCounter++).toString(36),
            __rev: revision,
            __a: 1,
            fb_dtsg,
            jazoest: ctx.ttstamp ? ctx.ttstamp : ttstamp
        }
        if (!Obj)
            return newObj;

        for (var prop in Obj)
            if (Obj.hasOwnProperty(prop))
                if (!newObj[prop])
                    newObj[prop] = Obj[prop];

        return newObj;
    }

    function postWithDefaults(url, jar, form, ctxx = ctx, customHeaders) {
        return post(url, jar, mergeWithDefaults(form), ctxx, customHeaders);
    }

    function getWithDefaults(url, jar, qs, ctxx = ctx, customHeaders) {
        return get(url, jar, mergeWithDefaults(qs), ctxx, customHeaders);
    }

    function postDataWithDefault(url, jar, form, qs, ctxx = ctx, customHeaders) {
        return postData(url, jar, mergeWithDefaults(form), mergeWithDefaults(qs), ctxx, customHeaders);
    }

    return {
        get: getWithDefaults,
        post: postWithDefaults,
        postData: postDataWithDefault
    }
}

function makeParsable(body) {
    var withoutForLoop = body.replace(/for\s*\(\s*;\s*;\s*\)\s*;\s*/, "");
    var maybeMultipleObjects = withoutForLoop.split(/\}\r\n *\{/);
    if (maybeMultipleObjects.length === 1)
        return maybeMultipleObjects;
    return "[" + maybeMultipleObjects.join("},{") + "]";
}

function parseAndCheckLogin(ctx, http, retryCount) {
    var delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    var _try = tryData => new Promise(function (resolve, reject) {
        try {
            resolve(tryData());
        } catch (error) {
            reject(error);
        }
    });
    if (retryCount === undefined) retryCount = 0;

    return function (data) {
        function any() {
            if (data.statusCode >= 500 && data.statusCode < 600) {
                if (retryCount >= 5) {
                    var err = new Error("Request retry failed. Check the `res` and `statusCode` property on this error.");
                    err.statusCode = data.statusCode;
                    err.res = data.body;
                    err.error = "Request retry failed. Check the `res` and `statusCode` property on this error.";
                    throw err;
                }
                retryCount++;
                var retryTime = Math.floor(Math.random() * 5000);
                var url = data.request.uri.protocol + "//" + data.request.uri.hostname + data.request.uri.pathname;
                if (data.request.headers["Content-Type"].split(";")[0] === "multipart/form-data") {
                    return delay(retryTime)
                        .then(function () {
                            return http
                                .postData(url, ctx.jar, data.request.formData);
                        })
                        .then(parseAndCheckLogin(ctx, http, retryCount));
                }
                else {
                    return delay(retryTime)
                        .then(function () {
                            return http
                                .post(url, ctx.jar, data.request.formData);
                        })
                        .then(parseAndCheckLogin(ctx, http, retryCount));
                }
            }
            if (data.statusCode !== 200)
                throw new Error("parseAndCheckLogin got status code: " + data.statusCode + ". Bailing out of trying to parse response.");

            var res = null;
            try {
                res = JSON.parse(makeParsable(data.body));
            } catch (e) {
                var err = new Error("JSON.parse error. Check the `detail` property on this error.");
                err.error = "JSON.parse error. Check the `detail` property on this error.";
                err.detail = e;
                err.res = data.body;
                throw err;
            }

            if (res.redirect && data.request.method === "GET") {
                return http
                    .get(res.redirect, ctx.jar)
                    .then(parseAndCheckLogin(ctx, http));
            }

            if (res.jsmods && res.jsmods.require && Array.isArray(res.jsmods.require[0]) && res.jsmods.require[0][0] === "Cookie") {
                res.jsmods.require[0][3][0] = res.jsmods.require[0][3][0].replace("_js_", "");
                var cookie = formatCookie(res.jsmods.require[0][3], "facebook");
                var cookie2 = formatCookie(res.jsmods.require[0][3], "messenger");
                ctx.jar.setCookie(request.cookie(cookie), "https://www.facebook.com");
                ctx.jar.setCookie(request.cookie(cookie2), "https://www.messenger.com");
            }

            if (res.jsmods && Array.isArray(res.jsmods.require)) {
                var arr = res.jsmods.require;
                for (var i in arr) {
                    if (arr[i][0] === "DTSG" && arr[i][1] === "setToken") {
                        ctx.fb_dtsg = arr[i][3][0];

                        ctx.ttstamp = "2";
                        for (var j = 0; j < ctx.fb_dtsg.length; j++) {
                            ctx.ttstamp += ctx.fb_dtsg.charCodeAt(j);
                        }
                    }
                }
            }

            if (res.error === 1357001) {
                var err = new Error('Facebook blocked login. Please visit https://facebook.com and check your account.');
                err.type = "Logout.";
                throw err;
            }
            return res;
        }
        return _try(any);
    }
}

function formatID(id) {
    if (id != undefined && id != null) {
        return id.replace(/(fb)?id[:.]/, "");
    }
    else {
        return id;
    }
}

function getDTSGInitData(ctx) {
    return get("https://www.facebook.com", ctx.jar)
        .then(function (res) {
            var body = res.body;
            ctx.fb_dtsg = /\["DTSGInitData",\[],{"token":"(.+?)"/g.exec(body)[1];
        });
}

function binaryToDecimal(data) {
    var ret = "";
    while (data !== "0") {
        var end = 0;
        var fullName = "";
        var i = 0;
        for (; i < data.length; i++) {
            end = 2 * end + parseInt(data[i], 10);
            if (end >= 10) {
                fullName += "1";
                end -= 10;
            } else
                fullName += "0";
        }
        ret = end.toString() + ret;
        data = fullName.slice(fullName.indexOf("1"));
    }
    return ret;
}

function generateOfflineThreadingID() {
    var ret = Date.now();
    var value = Math.floor(Math.random() * 4294967295);
    var str = ("0000000000000000000000" + value.toString(2)).slice(-22);
    var message = ret.toString(2) + str;
    return binaryToDecimal(message);
}

function generateTimestampRelative() {
    var d = new Date();
    return d.getHours() + ":" + padZeros(d.getMinutes());
}

function padZeros(val, len) {
    val = String(val);
    len = len || 2;
    while (val.length < len) val = "0" + val;
    return val;
}

function generateThreadingID(clientID) {
	var k = Date.now();
	var l = Math.floor(Math.random() * 4294967295);
	var m = clientID;
	return "<" + k + ":" + l + "-" + m + "@mail.projektitan.com>";
}

var utils = {
    getJar: request.jar,
    cookie: request.cookie,
    setProxy,
    parseProxy,
    get,
    post,
    postData,
    isReadableStream,
    getGUID,
    getSignatureID,
    makeDefaults,
    parseAndCheckLogin,
    formatID,
    getDTSGInitData,
    generateOfflineThreadingID,
    generateTimestampRelative,
    generateThreadingID
}

Object.assign(utils, utilsLib);

module.exports = utils;