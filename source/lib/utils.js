var fs = require("fs");
var path = require("path");

function getType(data) {
    return Object.prototype.toString.call(data).slice(8, -1);
}

function getTime(format = "HH:mm:ss DD/MM/YYYY", time = new Date(Date.now()), options = {
    hour12: false,
    day: "numeric",
    month: "numeric",
    year: "numeric",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
}) {
    var { time_zone, language } = require("../../config.json").systemOptions;
    if (time_zone === "vi-VN" || time_zone === "en-US") {
        if (getType(time) === "Number" || getType(time) === "String") 
            time = new Date(time);

        options.timeZone = time_zone;

        var lastTime = time.toLocaleString(language, options);
        return format.replace(/HH|mm|ss|DD|MM|YYYY|dddd/g, function (key) {
            if (time_zone === "vi-VN") {
                if (key === "HH")
                    return lastTime.slice(0, 2);
                else if (key === "mm")
                    return lastTime.slice(3, 5);
                else if (key === "ss")
                    return lastTime.slice(6, 8);
                else if (key === "dddd")
                    return lastTime.split(",")[0].slice(9, lastTime.length);
                else {
                    var date = lastTime.split(", ")[1].split("/");
                    if (key === "DD")
                        return date[0];
                    else if (key === "MM")
                        return date[1];
                    else if (key === "YYYY")
                        return date[2];
                }
            } else {
                var [day, date, time] = lastTime.split(", ");
                if (key === "HH")
                    return time.slice(0, 2);
                else if (key === "mm")
                    return time.slice(3, 5);
                else if (key === "ss")
                    return time.slice(6, 8);
                else if (key === "dddd")
                    return day;
                else {
                    date = date.split("/");
                    if (key === "DD")
                        return date[0];
                    else if (key === "MM")
                        return date[1];
                    else if (key === "YYYY")
                        return date[2];
                }
            }
        });
    } else {
        var moment = require("moment-timezone").tz(time, time_zone);
        return moment.format(format);
    }
}

function isAuthenticated(req) {
    return req.session && req.session.loggedIn === true;
}

function requestChecked(req, res, next) {
    var headers = req.headers;

    if (headers.referer || headers.origin)
        next();
    else {
        res.status(403);
        res.render("403");
    }
}

function isPath(url) {
    try {
        var resolveURL = path.resolve(url);
        return resolveURL === url || resolveURL === path.normalize(url);
    } catch (error) {
        return false;
    }
}

function isURL(url) {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
}

function randomStr({ length = 10, number = true, letter = true, symbol = false }) {
    var numberChars = "0123456789";
    var letterChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    var symbolChars = "!@#$%^&*()_+[]{}|;:',.<>/?";
    var characterPool = "";

    if (number) 
        characterPool += numberChars;
    if (letter) 
        characterPool += letterChars;
    if (symbol) 
        characterPool += symbolChars;
    if (!characterPool)
        throw new Error("At least one character type should be selected.");

    var randomString = "";
    for (var i = 0; i < length; i++) {
        var index = Math.floor(Math.random() * characterPool.length);
        randomString += characterPool[index];
    }

    return randomString;
}

function createMessenger(apis, info) {
    var { Messenger } = apis;
    return {
        getText: _ => _,
        send: function (message, ...inputs) {
            inputs = !inputs ? [] : inputs;
            return Messenger.send(this.getText(message, inputs), info.threadID);
        },
        unsend: messageID => Messenger.unsend(messageID),
        reply: function (message, ...inputs) {
            inputs = !inputs ? [] : inputs;
            return Messenger.send(this.getText(message, inputs), info.threadID, info.messageID);
        },
        react: icon => Messenger.react(icon, info.threadID, info.messageID)
    }
}

module.exports = {
    getTime,
    getType,
    isAuthenticated,
    requestChecked,
    isPath,
    isURL,
    randomStr,
    createMessenger
}
