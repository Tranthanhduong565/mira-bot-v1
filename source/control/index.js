var utils = require("../lib/utils");
var log = require("../lib/log");
var fs = require("fs");
var Child = require("child_process");
const { set } = require("mongoose");

var acceptType = [
    "message",
    "message_reply",
    "message_unsend",
    "message_reaction"
];

var requiredOptions = {
    name: [
        "String",
        true
    ],
    version: [
        "String",
        true
    ],
    role: [
        "Number",
        true
    ],
    author: [
        "Array",
        true
    ],
    category: [
        "String",
        true
    ],
    description: [
        "Object",
        true
    ],
    delay: [
        "Number",
        true
    ],
    guides: [
        "Object",
        true
    ],
    dependencies: [
        "Array",
        false
    ],
    envConfig: [
        "Object",
        false
    ]
}

module.exports = function () {
    var apis = global.mira.apis;
    var { systemOptions, facebookAPIsOptions } = global.mira.config;

    if (systemOptions.autoLoadPlugins.enable) {
        var path = require("path");
        var fs = require("fs");
        var dir = path.resolve(global.mira.dir, "plugins");
        var plugins = fs.readdirSync(dir).filter(item => item.endsWith(".js") && !systemOptions.autoLoadPlugins.ignore.includes(item));

        function LoadPlugin(pluginPath) {
            delete require.cache[pluginPath];
            function error(message) {
                var error = new Error(message);
                error.at = pluginPath;
                return error;
            }
            try {
                var pl = new (require(pluginPath))();
                var Options = pl.Options;
                var Langs = pl.Langs;
                var Reply = pl.Reply;
                var React = pl.React;
                var Schedule = pl.Schedule;
                var Events = pl.Events;
                var Main = pl.Main;
                if (utils.getType(Options) !== "Object")
                    throw error("Object is required in Options");

                for (var item of Object.entries(requiredOptions)) {
                    if (item[1][1] && !Options[item[0]].toString() || utils.getType(Options[item[0]]) !== item[1][0])
                        throw error(item[0] + " is not accepted.");
                }

                if (typeof Main !== "function")
                    throw error("function is required in Main.");

                if (utils.getType(Langs) !== "Object")
                    throw error("Object is required in " + lang);

                for (var lang in Langs) {
                    if (utils.getType(Langs[lang]) !== "Object")
                        throw error("Object is required in " + lang);

                    for (var content in Langs[lang]) {
                        if (utils.getType(Langs[lang][content]) !== "String")
                            throw error("String is required in " + content);
                    }
                }

                if (Reply && typeof Reply !== "function")
                    throw error("Reply must be function");
                if (React && typeof React !== "function")
                    throw error("React must be function");
                if (Schedule && typeof Schedule !== "function")
                    throw error("Schedule must be function");
                if (Events && typeof Events !== "function")
                    throw error("Events must be function");

                if (Options.dependencies) {
                    pl.dependencies = {}
                    var execOptions = {
                        cwd: dir,
                        stdio: "inherit",
                        shell: true
                    }
                    for (var dependencie of Options.dependencies) {
                        try {
                            pl.dependencies[dependencie] = require(dependencie);
                        } catch (error) {
                            Child.execSync("npm install " + dependencie, execOptions);
                            pl.dependencies[dependencie] = require(dependencie);
                        }
                    }
                }

                if (Options.envConfig) {
                    var envConfig = {}
                    envConfig[Options.name] = {}
                    for (var env in Options.envConfig) {
                        envConfig[Options.name][env] = Options.envConfig[env];
                    }
                    global.mira.configCommands = envConfig;
                }

                global.modules.cmds = global.modules.cmds.filter(item => item[0] !== Options.name);
                global.modules.cmds.push([Options.name, pl]);
            } catch (error) {
                console.log(error);
            }
        }

        plugins.forEach(plugin => {
            var pluginPath = path.resolve(dir, plugin);
            LoadPlugin(pluginPath);
            if (systemOptions.autoReloadPlugins.enable && !systemOptions.autoReloadPlugins.ignore.includes(plugin)) {
                var lastReload = fs.statSync(pluginPath).mtimeMs;
                var reloading = false;

                function reload() {
                    if (reloading)
                        return;
                    reloading = true;
                    setTimeout(function () {
                        reloading = false;
                        if (lastReload === fs.statSync(pluginPath).mtimeMs)
                            return;

                        try {
                            LoadPlugin(pluginPath);
                            log.info("control.modules.reload", plugin);
                        } finally { }
                    }, 2000);
                }
                fs.watch(pluginPath, type => {
                    if (type === "change")
                        reload();
                });
            }
        });

        log.info("control.modules.len", global.modules.cmds.length);
    }

    var Client = new apis.Client();
    var model = require("./model");
    log.info("control.model.connect");
    log.info("control.Client.connect");
    log.wall();
    global.mira.Client = Client;

    if (facebookAPIsOptions.autoReconnectMqtt.enable) {
        setInterval(function () {
            log.info("control.Client.reconnect");
            Client.reconnect();
        }, facebookAPIsOptions.autoReconnectMqtt.timeMS);
    }

    return Client
        .on("message", message => {
            if (message.type === "event") {
                model.db.updateDataBase(message);
            } else if (acceptType.includes(message.type)) {
                if (message.type === "message")
                    model.Main(message);
                if (message.type === "message_reply")
                    model.Reply(message);
                if (message.type === "message_reaction")
                    model.React(message);
                model.db.createDataBase(message);
            }
        })
        .on("error", function (error) {
            if (error.type === "disconnect")
                Client.disconnect();

            log.error("control.Client.error", error.message || error);
            console.log(error);
        });
}
