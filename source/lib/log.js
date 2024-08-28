var { getTime } = require("./utils.js");
var { existsSync } = require("fs");

function color(text) {
    return {
        black: "\x1b[30m" + text + "\x1b[0m",
        red: "\x1b[31m" + text + "\x1b[0m",
        green: "\x1b[32m" + text + "\x1b[0m",
        yellow: "\x1b[33m" + text + "\x1b[0m",
        blue: "\x1b[34m" + text + "\x1b[0m",
        magenta: "\x1b[35m" + text + "\x1b[0m",
        cyan: "\x1b[36m" + text + "\x1b[0m",
        white: "\x1b[37m" + text + "\x1b[0m",
        bgBlack: "\x1b[40m" + text + "\x1b[0m",
        bgRed: "\x1b[41m" + text + "\x1b[0m",
        bgGreen: "\x1b[42m" + text + "\x1b[0m",
        bgYellow: "\x1b[43m" + text + "\x1b[0m",
        bgBlue: "\x1b[44m" + text + "\x1b[0m",
        bgMagenta: "\x1b[45m" + text + "\x1b[0m",
        bgCyan: "\x1b[46m" + text + "\x1b[0m",
        bgWhite: "\x1b[47m" + text + "\x1b[0m"
    }
}

function parseDir(dir, inputs = []) {
    try {
        var { language } = require("../../config.json").systemOptions;
        var languagePath = __dirname + "/../languages/" + language + ".json";

        if (!existsSync(languagePath))
            languagePath = __dirname + "/../languages/vi-VN.json";

        if (/^([^.]+)(\.[^.]+)*$/.test(dir)) {
            var languageData = require(languagePath);
            var ArrayKey = dir.split(".");
            var content = languageData;

            for (var key of ArrayKey)
                content = content[key];

            if (inputs.length > 0) {
                for (var index = 1; index <= inputs.length; index++)
                    content = content.replace("%" + index, inputs[index - 1]);
            }

            return content;
        }
        return dir;
    } catch (error) {
        console.log(error);
        return dir;
    }
}

function info(dir, ...inputs) {
    inputs = !inputs ? [] : inputs;
    var time = getTime();
    var content = parseDir(dir, inputs);
    var output = color("[ " + time + " ] ").green + content;
    return console.log(output);
}

function warn(dir, ...inputs) {
    inputs = !inputs ? [] : inputs;
    var time = getTime();
    var content = parseDir(dir, inputs);
    var output = color("[ " + time + " ] ").yellow + content;
    return console.log(output);
}

function error(dir, ...inputs) {
    inputs = !inputs ? [] : inputs;
    var time = getTime();
    var content = parseDir(dir, inputs);
    var output = color("[ " + time + " ] ").red + content;
    return console.log(output);
}

function wall() {
    var content = color("====================================================").blue;
    return console.log(content);
}

function input(dir, col = "green", timeout = 30000) {
    var time = getTime();
    var content = parseDir(dir, []);
    var output = color("[ " + time + " ] ")[col] + content;
    process.stdout.write(output);
    return new Promise((resolve, reject) => {
        var data = "";
        var inputReceived = false;
        var timer = setTimeout(() => {
            if (!inputReceived) {
                process.stdout.write("\n");
                resolve(data.trim());
            }
        }, timeout);
        process.stdin.setEncoding("utf8");
        process.stdin.on("data", (chunk) => {
            clearTimeout(timer);
            data += chunk;
            inputReceived = true;
            process.stdin.pause();
            resolve(data.trim());
        });
        process.stdin.on("error", (err) => {
            clearTimeout(timer);
            reject(err);
        });
        process.stdin.on("end", () => {
            clearTimeout(timer);
            resolve(data.trim());
        });
        process.stdin.resume();
    });
}

module.exports = {
    info,
    warn,
    error,
    wall,
    color,
    input,
    parseDir
}