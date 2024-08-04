var log = require("./log.js");
var fs = require("fs");

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
    if (getType(time) === "Number" || getType(time) === "String") time = new Date(time);

    options.timeZone = time_zone;

    var lastTime = time.toLocaleString(language, options);
    return format.replace(/HH|mm|ss|DD|MM|YYYY|dddd/g, function (key) {
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
    });
}

module.exports = {
    getTime,
    getType
}