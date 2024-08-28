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

    return function changeCover(image, callback) {
        var pCallback;
        var returnPromise = new Promise(function (resolve, reject) {
            pCallback = (error, data) => error ? reject(error) : resolve(data);
        });

        if (typeof callback !== "function")
            callback = pCallback;

        handleUpload(image)
            .then(res => ({
                fb_api_caller_class: "RelayModern",
                fb_api_req_friendly_name: "ProfileCometCoverPhotoUpdateMutation",
                variables: JSON.stringify({
                    input: {
                        attribution_id_v2: `ProfileCometCollectionRoot.react,comet.profile.collection.photos_by,unexpected,${Date.now()},770083,,;ProfileCometCollectionRoot.react,comet.profile.collection.photos_albums,unexpected,${Date.now()},470774,,;ProfileCometCollectionRoot.react,comet.profile.collection.photos,unexpected,${Date.now()},94740,,;ProfileCometCollectionRoot.react,comet.profile.collection.saved_reels_on_profile,unexpected,${Date.now()},89669,,;ProfileCometCollectionRoot.react,comet.profile.collection.reels_tab,unexpected,${Date.now()},152201,,`,
                        cover_photo_id: res.payload.fbid,
                        focus: {
                            x: 0.5,
                            y: 1
                        },
                        target_user_id: ctx.userID,
                        actor_id: ctx.userID,
                        client_mutation_id: Math.round(Math.random() * 19).toString()
                    },
                    scale: 1,
                    contextualProfileContext: null
                }),
                doc_id: "8247793861913071"
            }))
            .then(form => http.post("https://www.facebook.com/api/graphql", ctx.jar, form))
            .then(utils.parseAndCheckLogin(ctx, http))
            .then(function (res) {
                if (res.error || res.errors)
                    throw res;

                return callback(null, {
                    url: res.data.profile_picture_set
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