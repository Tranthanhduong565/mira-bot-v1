var log = require("../lib/log");
var utils = require("./utils");
var utilsLib = require("../lib/utils");
var fs = require("fs");
const { clearInterval } = require("timers");
var globalOptions = global.mira.config.facebookAPIsOptions;

function buildAPIs(body, jar, whiteID, loginCount) {
    var infoCookies = jar
        .getCookies("https://www.facebook.com")
        .reduce(function (form, cookies) {
            var [name, value] = cookies.cookieString().split("=");
            form[name] = value;
            return form;
        }, {});

    if (!infoCookies.i_user && !infoCookies.c_user) {
        log.warn("system.facebook.login.notFoundUserID");
        if (globalOptions.forceLogin) {
            log.warn("system.facebook.login.force");
            return Login(false, loginCount += 1);
        } else
            process.exit(1);
    }

    var userID = whiteID === infoCookies.i_user ? infoCookies.i_user : infoCookies.c_user;
    log.info("system.facebook.login.success", userID);
    var clientID = (Math.random() * 2147483648 | 0).toString(16);
    var apis = {
        getAppState: function getAppState() {
            return jar
                .getCookies("https://www.facebook.com")
                .concat(jar.getCookies("https://www.messenger.com"));
        }
    }

    var endpoint, region;
    var endpointExec = /"appID":219994525426954,"endpoint":"(.+?)"/g.exec(body);
    if (endpointExec) {
        endpoint = endpointExec[1].replace("\\", "");
        region = new URL(endpoint).searchParams.get("region").toUpperCase();
        log.info("system.facebook.login.region", region);
    } else
        log.warn("system.facebook.login.notRegion");

    var ctx = {
        userID,
        region,
        endpoint,
        clientID,
        jar,
        globalOptions,
        isLogin: true,
        firstListen: true,
        lastSeqID: null,
        clientMutationID: 0
    }

    var http = utils.makeDefaults(body, userID, ctx);
    fs.readdirSync(__dirname + "/lib")
        .filter(item => item.endsWith(".js"))
        .map(function (item) {
            apis[item.replace(".js", "")] = require("./lib/" + item)(http, apis, ctx);
        });
    
    global.mira.apis = apis;

    var checkLogin = setInterval(function () {
        if (ctx.isLogin) 
            return;

        log.warn("system.facebook.login.logout");
        if (globalOptions.autoReconnect) {
            log.warn("system.facebook.login.reconnect");
            clearInterval(checkLogin);
            return Login(false, loginCount += 1);
        }
    }, 5000);

    return true;
}

async function makeLogin(email, password, proxy) {
    var Browser;
    var Pup = require("puppeteer");
    var Proxy = utils.parseProxy(proxy);

    if (Proxy && Proxy.length > 0) {
        Browser = await Pup.launch({ headless: false, args: ["--proxy-server=" + proxy] });
    } else
        Browser = await Pup.launch({ headless: false });

    var Page = await Browser.newPage();

    if (Proxy && Proxy[0] && Proxy[1])
        await Page.authenticate({
            username: Proxy[0],
            password: Proxy[1]
        });

    await Page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36");
    await Page.goto("https://www.facebook.com");
    await Page.type("input[name=\"email\"]", email);
    await Page.type("input[name=\"pass\"]", password);
    await Page.click("button[name=\"login\"]");
    var PromiseRace = Page.waitForNavigation({ waitUntil: "networkidle0" });
    await new Promise(resolve => setTimeout(resolve, 5000));
    var currentUrl = Page.url();

    if (currentUrl.indexOf("/two_step_verification/two_factor/") >= 0) {
        log.warn("system.facebook.checkpoint");
        var intervalCheckURL;
        var waitForCheckpoint = new Promise(resolve => {
            intervalCheckURL = setInterval(function () {
                var currentURL = Page.url();
                if (currentURL.indexOf("/two_factor/remember_browser/") >= 0)
                    resolve();
            }, 5000);
        });
        setTimeout(function () {
            log.warn("system.facebook.missTimeCheckpoint");
            process.exit(1);
        }, 60 * 1000);
        await waitForCheckpoint;
        clearInterval(intervalCheckURL);
    }

    await PromiseRace;
    var appState = await Page.cookies();
    await Browser.close();
    return appState;
}

function LoginHelper(appState, email, password, proxy, whiteID, loginCount) {
    if (appState) {
        var jar = utils.getJar();

        if (typeof appState === "string") {
            appState = decodeURIComponent(appState).split("; ").map(item => {
                var [key, value] = item.split("=");
                return {
                    key,
                    value,
                    domain: "facebook.com",
                    path: "/",
                    expires: new Date().getTime() + 1000 * 60 * 60 * 24 * 365
                }
            });
        }
        appState.map(item => {
            var string = [
                (item.key || item.name) + "=" + item.value,
                "expires=" + item.expires,
                "domain=" + item.domain,
                "path=" + item.path
            ].join("; ");
            jar.setCookie(utils.cookie(string), "http://" + item.domain);
        });

        return utils
            .get("https://www.facebook.com", jar, null, null, { noRef: true })
            .then(function (res) {
                var reg = /<meta http-equiv="refresh" content="0;url=([^"]+)[^>]+>/;
                var redirect = reg.exec(res.body);
                if (redirect && redirect[1]) {
                    return utils
                        .get(redirect[1], jar);
                }
                return res;
            })
            .then(res => buildAPIs(res.body, jar, whiteID, loginCount))
            .catch(function (error) {
                log.error("system.facebook.login.reject", error.message);
                throw new Error(error);
            });
    } else if (email && email.length > 0 && password && password.length > 0) {
        return makeLogin(email, password, proxy)
            .then(fbState => LoginHelper(fbState, email, password, proxy, whiteID, loginCount));
    } else {
        log.warn("system.config.missing.infomation");
        process.exit(1);
    }
}

function Login(firstLogin = true, loginCount = 0) {
    if (loginCount >= 3) {
        log.warn("system.facebook.login.error");
        process.exit(1);
    }

    var appState;
    var { email, password, cookies, facebookState, proxy, whiteID } = global.mira.config.facebookAccountOptions;

    if (cookies && cookies.length > 0)
        appState = cookies;
    else if (facebookState && facebookState.length > 0) {
        var path = __dirname + "/../../" + facebookState;
        var isExist = fs.existsSync(path);
        if (isExist)
            appState = require(path);
    }

    if (proxy && proxy.length > 0)
        utils.setProxy(proxy);

    proxy = proxy || "";
    appState = firstLogin ? appState : null;
    return LoginHelper(appState, email, password, proxy, whiteID, loginCount);
}

module.exports = Login;