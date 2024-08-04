process.on("unhandledRejection", console.log);
process.on("uncaughtException", console.log);

var log = require("./lib/log");
var utils = require("./lib/utils");
var config = require("../config.json");
var configCommands = require("../configCommands.json");

var fs = require("fs");
var axios = require("axios");

var dirConfig = __dirname + "/../config.json";
var dirConfigCommand = __dirname + "/../configCommands.json";

global.mira = {
    dirConfig,
    dirConfigCommand,
    configCommands,
    config,
    apis: null
}

global.modules = {
    commands: new Map(),
    eventCommands: new Map(),
    handlerReply: [],
    handlerReaction: [],
    handlerEvents: [],
    handlerSchedule: []
}

global.database = {
    model: null,
    userData: [],
    threadData: []
}

function trackAndReloadConfig(dir, prop) {
    var lastReload = fs.statSync(dir).mtimeMs;
    var isFirstReload = true;
    fs.watch(dir, type => {
        if (type === "change") {
            setTimeout(function () {
                if (lastReload === fs.statSync(dir).mtimeMs) return;
                if (isFirstReload) {
                    isFirstReload = false;
                    return;
                }

                var lastConfig = global.mira[prop];
                try {
                    delete require.cache[dir];
                    var newConfig = require(dir);
                    global.mira[prop] = newConfig;
                    return log.info("system.config.reload.success");
                } catch (error) {
                    global.mira[prop] = lastConfig;
                    return log.error("system.config.reload.error", error.message);
                }
            }, 5000);
        }
    });
}

trackAndReloadConfig(dirConfig, "config");
trackAndReloadConfig(dirConfigCommand, "configCommands");

function compare(str_1, str_2) {
    var bool;
    var comparseString = string => {
        var [type, version] = string.split("-");
        version = Number(version.split(".").join(""));
        return { type, version }
    }

    var test_1 = comparseString(str_1);
    var test_2 = comparseString(str_2);

    if (test_1.version > test_2.version)
        bool = true;
    else if (test_1.version < test_2.version)
        bool = false;
    else if (test_1.type === "release" && test_2.type === "beta")
        bool = true;
    else if (test_1.type === "beta" && test_2.type === "release")
        bool = false;
    else
        bool = false;

    return bool;
}

if (config.systemOptions.autoRestart.enable && parseInt(config.systemOptions.autoRestart.timeMS) > 0)
    setTimeout(process.exit, config.systemOptions.autoRestart.timeMS, 2);

(async () => {
    var currentVersion = require("../package.json").version;
    var lastVersion = (await axios.get("https://raw.githubusercontent.com/GiaKhang1810/mira-bot-v1/main/package.json")).data.version;
    if (compare(lastVersion, currentVersion)) {
        log.warn("system.update.newVersionAvailable", lastVersion, "https://github.com/GiaKhang1810/mira-bot-v1/");
        if (config.systemOptions.autoUpdate.enable) {
            var type = lastVersion.split("-")[0];
            if (!config.systemOptions.autoUpdate.releaseOnly || config.systemOptions.autoUpdate.releaseOnly && type === "release") {
                log.warn("system.update.auto");
                return require("./updater");
            }
        }
    } else log.info("system.update.notNewVersionAvailable");
    
    await require("./apis")();

    if (config.facebookAPIsOptions.autoRefreshState)
        fs.writeFileSync(__dirname + "/../" + config.facebookAccountOptions.facebookState, JSON.stringify(global.mira.apis.getAppState(), null, 2));
})();