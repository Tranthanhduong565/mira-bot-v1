var utils = require("../lib/utils");
var log = require("../lib/log");
var { apis } = global.mira;
var { model } = global.database;
var ScheduleInterval;

var bannedAPIs = [
    "Messenger",
    "Client",
    "markAsDelivered",
    "markAsRead",
    "getUserInfo"
];

async function createDataBase(message) {
    var { User, Thread } = model;
    var { threadID, participantIDs, isGroup } = message;

    if (isGroup) {
        try {
            await Thread.findOne(threadID);
        } catch (error) {
            log.error("database.create.fail", threadID, error.message);
            console.log(error);
        }
    } else {
        try {
            await User.findOne(threadID);
        } catch (error) {
            log.error("database.create.fail", threadID, error.message);
            console.log(error);
        }
    }

    for (var userID of participantIDs || []) {
        try {
            await User.findOne(userID);
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            log.error("database.create.fail", userID, error.message);
            console.log(error);
        }
    }
}

async function updateDataBase(message) {

}

function levenshteinDistance(str1, str2) {
    var len1 = str1.length;
    var len2 = str2.length;
    var dp = [];

    for (var i = 0; i <= len1; i++)
        dp[i] = [i];
    for (var j = 0; j <= len2; j++)
        dp[0][j] = j;
    for (var i = 1; i <= len1; i++) {
        for (var j = 1; j <= len2; j++) {
            var cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }

    return dp[len1][len2];
}

function similarityScore(str1, str2) {
    var maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0)
        return 1.0;
    var distance = levenshteinDistance(str1, str2);
    return (maxLength - distance) / maxLength;
}

function findBestMatch(target, possibleMatches) {
    var bestMatch = "";
    var bestScore = 0;

    for (var match of possibleMatches) {
        var score = similarityScore(target, match);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = match;
        }
    }

    return {
        target: bestMatch,
        rating: bestScore
    }
}

async function Main(info) {
    var allCMD = [...global.modules.cmds];
    var { prefix, adminOnly, adminIDs } = global.mira.config.botOptions;
    var { language } = require("../../config.json").systemOptions;
    var { senderID, threadID, isGroup } = info;
    var { User, Thread } = model;
    var escapedPrefix = prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    var prefixRegex = new RegExp("^" + escapedPrefix, "i");
    var isCalled = prefixRegex.test(info.body);
    if (!isCalled)
        return;

    var [namePlg, ...args] = info.body.replace(prefixRegex, "").trim().split(/\s+/);
    var cmd = allCMD.find(item => item[0] === namePlg);
    var Messenger = utils.createMessenger(apis, info);
    var userData = await User.findOne(senderID);
    var userID = parseInt(senderID);

    if (adminOnly && !adminIDs.includes(userID))
        return;

    if (isGroup) {
        var threadData = await Thread.findOne(threadID);
        if (threadData.banAt > 0 && !adminIDs.includes(userID))
            return Messenger.reply(log.parseDir("control.model.threadBanned", [threadData.reason, utils.getTime(null, threadData.banAt)]));
    }

    if (userData.banAt > 0 && !adminIDs.includes(userID))
        return Messenger.reply(log.parseDir("control.model.userBanned", [userData.reason, utils.getTime(null, userData.banAt)]));

    if (namePlg.length === 0)
        return Messenger.reply(log.parseDir("control.model.noPluginCalled", prefix));

    if (!cmd) {
        var allPlugins = allCMD.map(item => item[0]);
        var bestMatch = findBestMatch(namePlg, allPlugins);
        var content = log.parseDir("control.model.notExist", [namePlg, bestMatch.target]);
        return Messenger.reply(content);
    }

    var pl = cmd[1];
    var Langs = pl.Langs[language] || pl.Langs[Object.keys(pl.Langs)[0]];

    function getText(dir, inputs) {
        try {
            if (Langs.hasOwnProperty(dir)) {
                var content = Langs[dir];

                if (inputs.length > 0) {
                    for (var index = 1; index <= inputs.length; index++)
                        content = content.replace("%" + index, inputs[index - 1]);
                }

                content = content.replace(/{p}|{n}/g, match => match === "{p}" ? prefix : namePlg);
                return content;
            }
            return dir;
        } catch (error) {
            console.log(error);
            return dir;
        }
    }

    var subAPIs = { ...apis }

    for (var api of bannedAPIs)
        delete subAPIs[api];

    Messenger.getText = getText;

    var util = {
        args,
        Messenger,
        events: info,
        ...model,
        apis: subAPIs
    }

    try {
        pl.Main(util);
    } catch (error) {
        console.log(error);
    }
}

async function Events(info) {
    var allCMD = [...global.modules.cmds];
    var { prefix, adminOnly, adminIDs } = global.mira.config.botOptions;
    var { language } = require("../../config.json").systemOptions;
    var { senderID, threadID, isGroup } = info;
    var { User, Thread } = model;
    var escapedPrefix = prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    var prefixRegex = new RegExp("^" + escapedPrefix, "i");
    var isCalled = prefixRegex.test(info.body);
    if (isCalled || senderID === apis.getCurrentUserID())
        return;

    var args = info.body.trim().split(/\s+/);
    var Messenger = utils.createMessenger(apis, info);
    var userData = await User.findOne(senderID);
    var userID = parseInt(senderID);

    if (adminOnly && !adminIDs.includes(userID))
        return;

    if (isGroup) {
        var threadData = await Thread.findOne(threadID);
        if (threadData.banAt > 0 && !adminIDs.includes(userID))
            return;
    }

    if (userData.banAt > 0 && !adminIDs.includes(userID))
        return;

    for (var item of allCMD.filter(item => !!item[1].Events)) {
        var pl = item[1];
        var Langs = pl.Langs[language] || pl.Langs[Object.keys(pl.Langs)[0]];

        function getText(dir, inputs) {
            try {
                if (Langs.hasOwnProperty(dir)) {
                    var content = Langs[dir];

                    if (inputs.length > 0) {
                        for (var index = 1; index <= inputs.length; index++)
                            content = content.replace("%" + index, inputs[index - 1]);
                    }

                    content = content.replace(/{p}|{n}/g, match => match === "{p}" ? prefix : namePlg);
                    return content;
                }
                return dir;
            } catch (error) {
                console.log(error);
                return dir;
            }
        }

        var subAPIs = { ...apis }

        for (var api of bannedAPIs)
            delete subAPIs[api];

        Messenger.getText = getText;

        var util = {
            args,
            Messenger,
            events: info,
            ...model,
            apis: subAPIs
        }

        try {
            pl.Events(util);
        } catch (error) {
            console.log(error);
        }
    }
}

async function Reply(info) {
    
}

module.exports = {
    db: {
        createDataBase,
        updateDataBase
    },
    Main,
    Events
}