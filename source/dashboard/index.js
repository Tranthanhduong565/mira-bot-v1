var log = require("../lib/log");
var utils = require("../lib/utils");

var path = require("path");
var Express = require("express");
var ExpressWs = require("express-ws");
var ExpressSession = require("express-session")({
    secret: "không có gì là bí mật.",
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true
    }
});
var Os = require("os");
var fs = require("fs");

var App = Express();

ExpressWs(App);
App.set("view engine", "ejs");
App.set("views", path.resolve(__dirname, "views"));
App.use("/assets", utils.requestChecked, Express.static(path.resolve(__dirname, "assets")));
App.use(Express.urlencoded({ extended: true }));
App.use(Express.json());
App.use(ExpressSession);

if (global.mira.config.dashboardOptions.resetAccount) {
    var { Messenger } = global.mira.apis;
    var { adminIDs } = global.mira.config.botOptions;
    var templMail = utils.randomStr({ length: 10, letter: true, number: false }) + "@mira.com";
    var templPass = utils.randomStr({ length: 16 });
    global.mira.config = {
        dashboardOptions: {
            user: templMail,
            password: templPass
        }
    }

    var message =
        "==========================" +
        "\n• Email: " + templMail +
        "\n• Password: " + templPass +
        "\n• Timestamp: " + Date.now() +
        "\n==========================";
    adminIDs.map(id => Messenger.send(message, id, _ => {}));
}

App.post("/", function (req, res) {
    var { dashboardOptions } = global.mira.config;
    var body = req.body;
    var status, resData;

    if (body.url === "/login") {
        var { username, password, remember } = body;
        if (username === dashboardOptions.user && password === dashboardOptions.password) {
            req.session.loggedIn = true;
            req.session.username = username;

            req.session.cookie.maxAge = remember ? 7 * 24 * 60 * 60 * 1000 : 3 * 60 * 60 * 1000;
            req.session.cookie.secure = req.secure || req.headers["x-forwarded-proto"] === "https";
            req.session.cookie.httpOnly = true;

            status = 200;
            resData = {
                isLogin: true
            }
        } else {
            status = 401;
            resData = {
                message: "Wrong Username/Password."
            }
        }
    } else if (body.url === "/logout") {
        req.session.destroy();
        status = 200;
        resData = {
            isLogin: false
        }
    }

    res.status(status || 404);
    res.json(resData || {});
});

App.get("/login", function (req, res) {
    if (utils.isAuthenticated(req))
        res.redirect("/dashboard");
    else
        res.render("login");
});

App.get("/", function (req, res) {
    if (utils.isAuthenticated(req))
        res.redirect("/dashboard");
    else
        res.redirect("/login");
});

App.use(function (req, res) {
    res.status(404);
    res.render("404");
});

var interfaces = Os.networkInterfaces();
var info;

for (var network in interfaces) {
    if (info)
        break;

    info = interfaces[network].find(item => !item.internal && item.family === "IPv4");
}

var Server = App.listen(global.mira.config.dashboardOptions.port, _ => {
    var port = Server.address().port;

    log.info("dashboard.port", port);
    log.info("dashboard.ip", info.address);
    log.info("dashboard.host", "http://" + info.address + ":" + port);
    log.wall();
});

