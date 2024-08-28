var utils = require("../utils");

module.exports = function (http, apis, ctx) {
    function parseData(data) {
        var retObj = {}

        for (var prop in data) {
            if (data.hasOwnProperty(prop)) {
                var innerObj = data[prop];
                retObj[prop] = {
                    name: innerObj.name,
                    firstName: innerObj.firstName,
                    vanity: innerObj.vanity,
                    thumbSrc: innerObj.thumbSrc,
                    profileUrl: innerObj.uri,
                    gender: innerObj.gender,
                    type: innerObj.type,
                    isFriend: innerObj.is_friend,
                    isBirthday: !!innerObj.is_birthday,
                    searchTokens: innerObj.searchTokens,
                    alternateName: innerObj.alternateName,
                }
            }
        }

        return retObj;
    }

    function parseDataHighLevel(userIDs, data) {
        var retObj = {}

        for (var index in userIDs) {
            var res = data[index];
            if (Object.keys(res).length > 0) {
                retObj[res.id] = {
                    id: res.id,
                    name: res.name,
                    shortName: res.short_name || null,
                    verified: res.verified != false ? true : false,
                    email: res.email || null,
                    website: res.website || null,
                    follower: !!res.subscribers == true ? res.subscribers.summary.total_count : null,
                    lover: res.significant_other || null,
                    cover: !!res.cover == true ? res.cover.source : null,
                    first_name: res.first_name || null,
                    middle_name: res.middle_name || null,
                    last_name: res.last_name || null,
                    about: res.about || null,
                    birthday: res.birthday || null,
                    languages: res.languages || [],
                    gender: res.gender || null,
                    hometown: !!res.hometown == true ? res.hometown.name : null,
                    profileUrl: res.link || null,
                    location: !!res.location == true ? res.location.name : null,
                    username: res.username || null,
                    avatar: !!res.picture == true ? res.picture.data.url : null,
                    relationship_status: !!res.relationship_status == true ? res.relationship_status : null,
                    subscribers: !!res.subscribers == true ? res.subscribers.data : null,
                    favorite_athletes: !!res.favorite_athletes == false ? [] : res.favorite_athletes.map(v => ({
                        name: v.name
                    })),
                    education: !!res.education == true ? res.education.map(v => ({
                        type: v.type,
                        school: v.school.name
                    })) : [],
                    work: !!res.work == true ? res.work : []
                }
            } else
                retObj[userIDs[index]] = {}
        }

        return retObj;
    }

    function requestData(userID) {
        var qs = {
            fields: "id,name,verified,cover,first_name,email,about,birthday,gender,website,hometown,link,location,quotes,relationship_status,significant_other,username,subscribers.limite(0),short_name,last_name,middle_name,education,picture,work,languages,favorite_athletes",
            access_token: ctx.token
        }
        return utils
            .get("https://graph.facebook.com/v1.0/" + userID, ctx.jar, qs)
            .then(function (res) {
                return JSON.parse(res.body);
            })
            .catch(function (error) {
                console.log(error);
                return {}
            });
    }

    return function getUserInfo(userIDs, deprecated = false, callback) {
        var pCallback;
        var returnPromise = new Promise(function (resolve, reject) {
            pCallback = (error, data) => error ? reject(error) : resolve(data);
        });

        if (typeof deprecated === "function") {
            callback = deprecated;
            deprecated = false;
        }
        if (typeof callback !== "function")
            callback = pCallback;
        if (!Array.isArray(userIDs))
            userIDs = [userIDs];
        if (!deprecated) {
            var form = [];
            apis
                .getAccessToken()
                .then(function () {
                    userIDs.map(userID => form.push(requestData(userID)));
                    return Promise.all(form);
                })
                .then(function (res) {
                    return callback(null, parseDataHighLevel(userIDs, res));
                })
                .catch(function (error) {
                if (error.type === "logout.")
                    ctx.isLogin = false;
                console.log(error);
                return callback(error);
            });
        } else {
            var form = {}
            userIDs.map((value, index) => form["ids[" + index + "]"] = value);
            http
                .post("https://www.facebook.com/chat/user_info/", ctx.jar, form)
                .then(utils.parseAndCheckLogin(ctx, http))
                .then(function (res) {
                    if (res.error || res.errors)
                        throw new Error(res);

                    return callback(null, parseData(res.payload.profiles));
                })
                .catch(function (error) {
                    if (error.type === "logout.")
                        ctx.isLogin = false;
                    console.log(error);
                    return callback(error);
                });
        }

        return returnPromise;
    }
}