var utils = require("../utils");

module.exports = function (http, apis, ctx) {
    function handleUpload(image) {
        var callback;
        var returnPromise = new Promise(function (resolve, reject) {
            callback = (error, data) => error ? reject(error) : resolve(data);
        });

        if (!utils.isReadableStream(image))
            callback(new Error("image is not a readable stream"));

        var form = {
            profile_id: ctx.userID,
            photo_source: 57,
            av: ctx.userID,
            file: image
        }

        http
            .postData("https://www.facebook.com/profile/picture/upload/", ctx.jar, form)
            .then(utils.parseAndCheckLogin(ctx, http))
            .then(function (res) {
                if (res.error || res.errors)
                    throw res;

                return callback(null, res);
            })
            .catch(callback);

        return returnPromise;
    }

    return function changeAvatar(image, caption = "", timestamp = null, callback) {
        var pCallback;
        var returnPromise = new Promise(function (resolve, reject) {
            pCallback = (error, data) => error ? reject(error) : resolve(data);
        });

        if (typeof caption === "number") {
            timestamp = caption;
            caption = "";
        }
        if (typeof caption === "function") {
            callback = caption;
            caption = "";
        }
        if (typeof timestamp === "function") {
            callback = timestamp;
            timestamp = null;
        }
        if (typeof callback !== "function")
            callback = pCallback;

        handleUpload(image)
            .then(res => ({
                fb_api_req_friendly_name: "ProfileCometProfilePictureSetMutation",
                doc_id: "5066134240065849",
                variables: JSON.stringify({
                    input: {
                        caption,
                        existing_photo_id: res.payload.fbid,
                        expiration_time: timestamp,
                        profile_id: ctx.userID,
                        profile_pic_method: "EXISTING",
                        profile_pic_source: "TIMELINE",
                        scaled_crop_rect: {
                            height: 1,
                            width: 1,
                            x: 0,
                            y: 0
                        },
                        skip_cropping: true,
                        actor_id: ctx.userID,
                        client_mutation_id: Math.round(Math.random() * 19).toString()
                    },
                    isPage: false,
                    isProfile: true,
                    scale: 3
                }),
                fb_api_caller_class: "RelayModern"
            }))
            .then(form => http.post("https://www.facebook.com/api/graphql", ctx.jar, form))
            .then(utils.parseAndCheckLogin(ctx, http))
            .then(function (res) {
                if (res.error || res.errors)
                    throw res;

                return callback(null, {
                    url: res.data.user_update_cover_photo.user.cover_photo.photo.url
                });
            })
            .catch(function (error) {
                if (error.type === "logout.")
                    ctx.isLogin = false;

                console.log(error);
                return callback(error);
            });

        return returnPromise;
    }
}