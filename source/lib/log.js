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

function parseDir(dir, input) {
    var { language } = require("../../config.json").systemOptions;
    var languagePath = __dirname + "/../languages/" + language + ".json";

    if (!existsSync(languagePath)) {
        languagePath = __dirname + "/../languages/vi.json";
    }

    var languageData = require(languagePath);
    var ArrayKey = dir.split(".");
    var content = languageData;

    for (var key of ArrayKey) {
        content = content[key];
    }

    if (input.length > 0) {
        for (var index = 1; index <= input.length; index++) {
            content = content.replace("%" + index, input[index - 1]);
        }
    }

    return content;
}

function info(dir, ...input) {
    input = !input ? [] : input;
    var time = getTime();
    var content = parseDir(dir, input);
    var output = color("[ " + time + " ] ").green + content;
    return console.log(output);
}

function warn(dir, ...input) {
    input = !input ? [] : input;
    var time = getTime();
    var content = parseDir(dir, input);
    var output = color("[ " + time + " ] ").yellow + content;
    return console.log(output);
}

function error(dir, ...input) {
    input = !input ? [] : input;
    var time = getTime();
    var content = parseDir(dir, input);
    var output = color("[ " + time + " ] ").red + content;
    return console.log(output);
}

module.exports = {
    info,
    warn,
    error,
    color
}