var utils = require("../utils");
var Pup = require("puppeteer");

module.exports = function (http, apis, ctx) {
    return async function ScreenShotChromium(url, path, Options, callback) {
        var pCallback;
        var returnPromise = new Promise(function (resolve, reject) {
            pCallback = error => error ? reject(error) : resolve();
        });

        if (typeof url === "function") {
            callback = url;
            url = null;
        }
        if (typeof path === "function") {
            callback = path;
            path = null;
        }
        if (typeof Options === "function") {
            callback = Options;
            Options = {}
        }
        if (typeof Options !== "object") 
            Options = {}
        if (typeof callback !== "function")
            callback = pCallback;

        Options.userAgent = Options.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";
        Options.width = Options.width || 1920;
        Options.height = Options.height || 1080;
        Options.fullPage = Options.fullPage || false;

        if (!utils.isURL(url))
            callback(new Error("url is invalid"));
        else if (!utils.isPath(path))
            callback(new Error("path is invalid"));
        else {
            var Browser;
            var Proxy = utils.parseProxy(ctx.proxy);

            if (Proxy && Proxy.length > 0) {
                Browser = await Pup.launch({ headless: true, args: ["--proxy-server=" + ctx.proxy] });
            } else
                Browser = await Pup.launch({ headless: true });

            var Page = await Browser.newPage();

            if (Proxy && Proxy[0] && Proxy[1])
                await Page.authenticate({
                    username: Proxy[0],
                    password: Proxy[1]
                });

            var Cookies = apis.getAppState().map(item => ({
                name: item.key,
                value: item.value,
                domain: ".facebook.com",
                path: "/",
                secure: true,
                httpOnly: true
            }));

            await Page.setViewport({
                width: Options.width, 
                height: Options.height 
            });
            await Page.setUserAgent(Options.userAgent);
            await Page.setCookie(...Cookies);
            await Page.goto(url, { waitUntil: "networkidle0" });
            await Page.screenshot({ path, fullPage: Options.fullPage });
            await Browser.close();
            callback();
        }

        return returnPromise;
    }
}