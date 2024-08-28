var log = require("../lib/log");
var utils = require("./utils");
var fs = require("fs");
var globalOptions = global.mira.config.facebookAPIsOptions;

function buildAPIs(body, jar, whiteID, proxy, loginCount) {
    var infoCookies = jar
        .getCookies("https://www.facebook.com")
        .reduce(function (form, cookies) {
            var [name, value] = cookies.cookieString().split("=");
            form[name] = value;
            return form;
        }, {});

    if (!infoCookies.i_user && !infoCookies.c_user) {
        log.warn("facebook.login.notUser");
        if (globalOptions.forceLogin) {
            log.warn("facebook.relogin.force");
            return Login(false, loginCount += 1);
        } else
            process.exit(1);
    }

    var userID = whiteID === infoCookies.i_user ? infoCookies.i_user : infoCookies.c_user;
    log.info("facebook.login.user", userID);
    var clientID = (Math.random() * 2147483648 | 0).toString(16);
    var apis = {
        getAppState: function getAppState() {
            return jar
                .getCookies("https://www.facebook.com")
                .concat(jar.getCookies("https://www.messenger.com"));
        }
    }

    var endpoint, region, syncToken;
    var endpointExec = /"appID":219994525426954,"endpoint":"(.+?)"/g.exec(body);
    if (endpointExec) {
        endpoint = endpointExec[1].replace(/\\\//g, "/");
        region = new URL(endpoint).searchParams.get("region").toUpperCase();
        log.info("facebook.login.region", region);
    } else
        log.warn("facebook.login.notRegion");

    var ctx = {
        userID,
        region,
        endpoint,
        clientID,
        jar,
        get globalOptions() {
            return global.mira.config.facebookAPIsOptions;
        },
        isLogin: true,
        lastSeqID: null,
        clientMutationID: 0,
        proxy
    }

    var http = utils.makeDefaults(body, userID, ctx);
    fs.readdirSync(__dirname + "/lib")
        .filter(item => item.endsWith(".js"))
        .map(function (item) {
            apis[item.replace(".js", "")] = require("./lib/" + item)(http, apis, ctx);
        });
    log.info("facebook.apis", Object.keys(apis).length);
    global.mira.apis = apis;

    var checkLogin = setInterval(function () {
        if (ctx.isLogin)
            return;

        log.warn("facebook.login.logout");
        if (globalOptions.autoReconnect) {
            log.warn("facebook.login.reconnect");
            clearInterval(checkLogin);
            return Login(false, loginCount += 1);
        }
    }, 5000);

    return utils
        .post("https://www.facebook.com/v1.0/dialog/oauth/confirm", ctx.jar, {
            fb_dtsg: /\["DTSGInitData",\[],{"token":"(\S+)","async_get_token"/g.exec(body)[1],
            app_id: "124024574287414",
            redirect_uri: "fbconnect://success",
            display: "popup",
            return_format: "access_token",
        })
        .then(function (res) {
            var body = res.body;
            var token = body.match(/access_token=(.+?)&/);
            if (token && token[1]) {
                ctx.token = token[1];
                log.info("facebook.access.token", token[1]);
            } else
                throw new Error("Token is undefined.");
        })
        .catch(function (error) {
            log.warn("facebook.access.error", error.message);
            console.log(error);
        });
}

async function makeLogin(email, password, proxy) {
    var Browser;
    var Pup = require("puppeteer");
    var Proxy = utils.parseProxy(proxy);

    if (Proxy && Proxy.length > 0) {
        Browser = await Pup.launch({ headless: true, args: ["--proxy-server=" + proxy] });
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
    var waitForLoad = Page.waitForNavigation({ waitUntil: "networkidle0" });
    await new Promise(resolve => setTimeout(resolve, 5000));
    var currentUrl = Page.url();

    if (currentUrl.indexOf("/two_step_verification/two_factor/") > -1 || currentUrl.indexOf("/checkpoint/465803052217681") > -1) {
        log.warn("facebook.login.checkpoint");
        var timeoutCheckpoint = setTimeout(function () {
            log.warn("facebook.login.missTimeCheckpoint");
            process.exit(1);
        }, 2 * 60 * 1000);
        if (await Page.evaluate(_ => document.querySelectorAll("input").length) === 1) {
            async function waitForCheckpointSMS(length) {
                var NotChangeURL = _ => currentUrl === Page.url();
                var ReClick = _ => Page.click("span[class=\"x1lliihq x193iq5w x6ikm8r x10wlt62 xlyipyv xuxw1ft\"]");
                var GetCodeSMS = _ => log.input("facebook.access.codeSMS", "yellow", 60 * 1000);
                var EnterCodeSMS = SMS => length === 0 ? Page.type("input[dir=\"ltr\"", SMS) : Page.evaluate(SMS => {
                    var input = document.querySelector("input[dir=\"ltr\"");
                    if (input) {
                        input.value = SMS;
                        input.dispatchEvent(new Event("input", { bubbles: true }));
                    }
                }, SMS);

                if (length > 2)
                    throw new Error("Cant Authenticated With CodeSMS.");
                var SMS = await GetCodeSMS();
                if (SMS) {
                    await EnterCodeSMS(SMS);
                    await ReClick();
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    if (NotChangeURL()) {
                        log.warn("facebook.access.wrongSMS");
                        return waitForCheckpointSMS(length + 1);
                    }
                } else
                    throw new Error("CodeSMS is undefined.");
            }

            await waitForCheckpointSMS(0);
        } else {
            var intervalCheckURL;
            var waitForCheckpoint = new Promise(resolve => {
                intervalCheckURL = setInterval(function () {
                    var currentURL = Page.url();
                    if (currentURL.indexOf("/two_factor/remember_browser/") > -1)
                        resolve();
                }, 5000);
            });
            await waitForCheckpoint;
            clearInterval(intervalCheckURL);
        }
        clearTimeout(timeoutCheckpoint);
        await Page.click("div[class=\"x1n2onr6 x1ja2u2z x78zum5 x2lah0s xl56j7k x6s0dn4 xozqiw3 x1q0g3np x9f619 xi112ho x17zwfj4 x585lrc x1403ito x1qhmfi1 x1s9qjmn x39innc x7gj0x1 x1mpseq2 x13fuv20 xu3j5b3 x1q0q8m5 x26u7qi x178xt8z xm81vs4 xso031l xy80clv x1fq8qgq x1ghtduv x1oktzhs\"");
    }
    
    if (currentUrl.indexOf("/two_step_verification/authentication/") > -1) {
        log.warn("facebook.login.checkpointImage");
        process.exit(1);
    }

    if (currentUrl.indexOf("/login/") > -1) {
        log.warn("facebook.login.wrong");
        process.exit(1);
    }

    await waitForLoad;
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
            .then(res => buildAPIs(res.body, jar, whiteID, proxy, loginCount))
            .catch(function (error) {
                log.error("facebook.login.error");
                console.log(error);
                process.exit(1);
            });
    } else if (email && email.length > 0 && password && password.length > 0) {
        return makeLogin(email, password, proxy)
            .then(fbState => LoginHelper(fbState, email, password, proxy, whiteID, loginCount));
    } else {
        log.warn("facebook.missing");
        process.exit(1);
    }
}

function Login(firstLogin = true, loginCount = 1) {
    if (loginCount >= 3) {
        log.warn("facebook.relogin.error");
        process.exit(1);
    }

    var appState;
    var { email, password, cookies, facebookState, proxy, whiteID } = global.mira.config.facebookAccountOptions;
    var path = __dirname + "/../../" + facebookState;

    if (facebookState && facebookState.length > 0 && fs.existsSync(path))
        appState = require(path);
    else if (cookies && cookies.length > 0)
        appState = cookies;

    if (proxy && proxy.length > 0)
        utils.setProxy(proxy);

    proxy = proxy || "";
    appState = firstLogin ? appState : null;
    return LoginHelper(appState, email, password, proxy, whiteID, loginCount);
}

module.exports = Login;