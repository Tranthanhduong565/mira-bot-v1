/*
    Origin Source: https://github.com/ntkhang03/Goat-Bot-V2/blob/main/fb-chat-api/
    Converter: Khang
*/

var utils = require("../utils");
var allowedProperties = {
    attachments: true,
    url: true,
    sticker: true,
    emoji: true,
    emojiSize: true,
    body: true,
    mentions: true,
    location: true
}

function removeSpecialChar(inputString) {
    if (typeof inputString !== "string")
        return inputString;
    var buffer = Buffer.from(inputString, "utf8");
    let filteredBuffer = Buffer.alloc(0);
    for (let i = 0; i < buffer.length; i++) {
        if (buffer[i] === 0xEF && buffer[i + 1] === 0xB8 && buffer[i + 2] === 0x8F)
            i += 2;
        else
            filteredBuffer = Buffer.concat([filteredBuffer, buffer.slice(i, i + 1)]);

    }

    var convertedString = filteredBuffer.toString("utf8");
    return convertedString;
}

module.exports = function (http, apis, ctx) {
    function edit(message, messageID, callback) {
        var pCallback;
        var returnPromise = new Promise(function (resolve, reject) {
            pCallback = error => error ? reject(error) : resolve();
        });

        if (typeof message === "function") {
            callback = message;
            message = "";
        }
        if (typeof messageID === "function") {
            callback = messageID;
            messageID = null;
        }
        if (typeof callback !== "function")
            callback = pCallback;
        if (typeof messageID !== "string")
            callback(new Error("messageID must be an string"));
        else if (!ctx.Client)
            callback(new Error("You must connect mqtt first"));
        else {
            var queryPayload = {
                message_id: messageID,
                text: message
            }
            var query = {
                failure_count: null,
                label: "742",
                payload: JSON.stringify(queryPayload),
                queue_name: "edit_message",
                task_id: Math.round(Math.random() * 312312721413).toString()
            }

            var context = {
                app_id: "2220391788200892",
                payload: JSON.stringify({
                    data_trace_id: null,
                    epoch_id: 0,
                    tasks: [query],
                    version_id: "6903494529735864"
                }),
                request_id: Math.round(Math.random() * 312312721413).toString(),
                type: 3
            }
            ctx.Client.publish("/ls_req", JSON.stringify(context), { qos: 1, retain: false });
            callback();
        }

        return returnPromise;
    }

    function react(reaction, messageID, callback) {
        var pCallback;
        var returnPromise = new Promise(function (resolve, reject) {
            pCallback = error => error ? reject(error) : resolve();
        });

        if (typeof reaction === "function") {
            callback = reaction;
            reaction = "";
        }
        if (typeof messageID === "function") {
            callback = messageID;
            messageID = null;
        }
        if (typeof callback !== "function")
            callback = pCallback;
        if (typeof messageID !== "string")
            callback(new Error("messageID must be an string"));
        else {
            var variables = {
                data: {
                    client_mutation_id: Math.round(Math.random() * 312312721413).toString(),
                    actor_id: ctx.userID,
                    action: reaction === "" ? "REMOVE_REACTION" : "ADD_REACTION",
                    message_id: messageID,
                    reaction
                }
            }
            var qs = {
                doc_id: "1491398900900362",
                variables: JSON.stringify(variables),
                dpr: 1
            }

            http
                .postData("https://www.facebook.com/webgraphql/mutation/", ctx.jar, {}, qs)
                .then(utils.parseAndCheckLogin(ctx.jar, http))
                .then(function (res) {
                    if (res.error || res.errors)
                        throw res;
                    return callback();
                })
                .catch(function (error) {
                    if (error.type === "logout.")
                        ctx.isLogin = false;

                    return callback(error);
                });
        }

        return returnPromise;
    }

    function unsend(messageID, callback) {
        var pCallback;
        var returnPromise = new Promise(function (resolve, reject) {
            pCallback = error => error ? reject(error) : resolve();
        });

        if (typeof messageID === "function") {
            callback = messageID;
            messageID = null;
        }
        if (typeof callback !== "function")
            callback = pCallback;
        if (typeof messageID !== "string")
            callback(new Error("messageID must be an string"));
        else {
            http
                .post("https://www.facebook.com/messaging/unsend_message/", ctx.jar, { message_id: messageID })
                .then(utils.parseAndCheckLogin(ctx, http))
                .then(function (res) {
                    if (res.error || res.errors)
                        throw res;

                    return callback();
                })
                .catch(function (error) {
                    if (error.type === "logout.")
                        ctx.isLogin = false;

                    return callback(error);
                });
        }

        return returnPromise;
    }

    function send(message, threadID, messageID, callback, isGroup) {
        var pCallback;
        var returnPromise = new Promise(function (resolve, reject) {
            pCallback = error => error ? reject(error) : resolve();
        });

        if (typeof message === "function") {
            callback = message;
            message = null;
        }
        if (typeof threadID === "function") {
            callback = threadID;
            threadID = null;
        }
        if (typeof messageID === "function") {
            callback = messageID;
            messageID = null;
        }
        if (typeof callback !== "function")
            callback = pCallback;

        var messageType = utils.getType(message);
        var threadIDType = utils.getType(threadID);
        var messageIDType = utils.getType(messageID);

        var error;
        if (messageType !== "String" && messageType !== "Object")
            error = new Error("Message should be of type string or object and not " + messageType + ".");
        if (threadIDType !== "Array" && threadIDType !== "Number" && threadIDType !== "String")
            error = new Error("ThreadID should be of type number, string, or array and not " + threadIDType + ".");
        if (messageID && messageIDType !== "String")
            error = new Error("MessageID should be of type string and not " + messageIDType + ".");
        if (messageType === "String")
            message = {
                body: message
            }
        if (utils.getType(message.body) === "String")
            message.body = removeSpecialChar(message.body);

        var disallowedProperties = Object.keys(message).filter(prop => !allowedProperties[prop]);
        if (disallowedProperties.length > 0)
            error = new Error("Dissallowed props: `" + disallowedProperties.join(", ") + "`");
        if (error)
            callback(error);
        else {
            var messageAndOTID = utils.generateOfflineThreadingID();
            var form = {
                client: "mercury",
                action_type: "ma-type:user-generated-message",
                author: "fbid:" + ctx.userID,
                timestamp: Date.now(),
                timestamp_absolute: "Today",
                timestamp_relative: utils.generateTimestampRelative(),
                timestamp_time_passed: "0",
                is_unread: false,
                is_cleared: false,
                is_forward: false,
                is_filtered_content: false,
                is_filtered_content_bh: false,
                is_filtered_content_account: false,
                is_filtered_content_quasar: false,
                is_filtered_content_invalid_app: false,
                is_spoof_warning: false,
                source: "source:chat:web",
                "source_tags[0]": "source:chat",
                body: message.body ? message.body.toString() : "",
                html_body: false,
                ui_push_phase: "V3",
                status: "0",
                offline_threading_id: messageAndOTID,
                message_id: messageAndOTID,
                threading_id: utils.generateThreadingID(ctx.clientID),
                "ephemeral_ttl_mode:": "0",
                manual_retry_cnt: "0",
                has_attachment: !!(message.attachments || message.url || message.sticker),
                signatureID: utils.getSignatureID(),
                replied_to_message_id: messageID
            }
            handleLocation(message, form, threadID, messageAndOTID, callback, isGroup)
                .then(handleSticker)
                .then(handleAttachment)
                .then(handleURL)
                .then(handleEmoji)
                .then(handleMention)
                .then(function (input) {
                    if (utils.getType(input[2]) === "Array")
                        input[5] = false;
                    else {
                        if (utils.getType(input[5]) !== "Boolean")
                            input[5] = input[2].toString().length < 16;
                        else
                            input[5] = !input[5];
                    }

                    return input;
                })
                .then(sendContent)
                .catch(function (error) {
                    if (error.type === "logout.")
                        ctx.isLogin = false;

                    return callback(error);
                });
        }

        return returnPromise;
    }

    function handleLocation(...input) {
        if (input[0].location) {
            if (input[0].location.latitude === null || input[0].location.longitude === null)
                return Promise.reject(new Error("location property needs both latitude and longitude"));

            input[1]["location_attachment[coordinates][latitude]"] = input[0].location.latitude;
            input[1]["location_attachment[coordinates][longitude]"] = input[0].location.longitude;
            input[1]["location_attachment[is_current_location]"] = !!input[0].location.current;
        }
        return Promise.resolve(input);
    }

    function handleEmoji(input) {
        if (input[0].emojiSize !== null && input[0].emoji === null)
            return Promise.reject(new Error("emoji property is empty"));
        if (input[0].emoji) {
            if (input[0].emojiSize == null)
                input[0].emojiSize = "medium";
            if (input[0].emojiSize !== "small" && input[0].emojiSize !== "medium" && input[0].emojiSize !== "large")
                return Promise.reject(new Error("emojiSize property is invalid"));
            if (input[1].body !== null && input[1].body !== "")
                return Promise.reject(new Error("body is not empty"));
            input[1].body = input[0].emoji;
            input[1]["tags[0]"] = "hot_emoji_size:" + input[0].emojiSize;
        }

        return Promise.resolve(input);
    }

    function handleSticker(input) {
        if (input[0].sticker)
            input[1].sticker_id = input[0].sticker;
        return Promise.resolve(input);
    }

    function handleAttachment(input) {
        if (input[0].attachments) {
            input[1].image_ids = [];
            input[1].gif_ids = [];
            input[1].file_ids = [];
            input[1].video_ids = [];
            input[1].audio_ids = [];

            input[0].attachments = Array.isArray(input[0].attachments) ? input[0].attachments : [input[0].attachments];

            return handleUpload(input[0].attachments)
                .then(function (files) {
                    files.forEach(function (file) {
                        var key = Object.keys(file);
                        var type = key[0];
                        input[1][type + "s"].push(file[type]);
                    });
                    return input;
                });
        }

        return Promise.resolve(input);
    }

    function handleUpload(attachments) {
        var uploads = [];

        for (var i = 0; i < attachments.length; i++) {
            if (!utils.isReadableStream(attachments[i]))
                throw new Error("Attachment should be a readable stream and not " + utils.getType(attachments[i]) + ".");

            var form = {
                upload_1024: attachments[i],
                voice_clip: "true"
            }

            uploads.push(
                http
                    .postData("https://upload.facebook.com/ajax/mercury/upload.php", ctx.jar, form)
                    .then(utils.parseAndCheckLogin(ctx, http))
                    .then(function (res) {
                        if (res.error || res.errors)
                            throw res;
                        return res.payload.metadata[0];
                    })
            );
        }

        return Promise.all(uploads);
    }

    function handleURL(input) {
        if (input[0].url) {
            input[1]["shareable_attachment[share_type]"] = "100";

            return getURL()
                .then(function (params) {
                    input[1]["shareable_attachment[share_params]"] = params;
                    return input;
                });
        }

        return Promise.resolve(input);
    }

    function getURL(url) {
        var form = {
            image_height: 960,
            image_width: 960,
            uri: url
        }

        return http
            .post("https://www.facebook.com/message_share_attachment/fromURI/", ctx.jar, form)
            .then(utils.parseAndCheckLogin(ctx, http))
            .then(function (res) {
                if (res.error || res.errors || !res.payload)
                    throw res;

                return res.payload.share_data.share_params;
            });
    }

    function handleMention(input) {
        if (input[0].mentions) {
            for (var i = 0; i < input[0].mentions.length; i++) {
                var mention = input[0].mentions[i];

                var tag = mention.tag;
                if (typeof tag !== "string")
                    return Promise.reject(new Error("Mention tags must be strings."));

                var offset = input[0].body.indexOf(tag, mention.fromIndex || 0);

                var id = mention.id || 0;
                input[1]["profile_xmd[" + i + "][offset]"] = offset;
                input[1]["profile_xmd[" + i + "][length]"] = tag.length;
                input[1]["profile_xmd[" + i + "][id]"] = id;
                input[1]["profile_xmd[" + i + "][type]"] = "p";
            }
        }

        return Promise.resolve(input);
    }

    function sendContent(input) {
        if (utils.getType(input[2]) === "Array") {
            for (var i = 0; i < input[2].length; i++)
                input[1]["specific_to_list[" + i + "]"] = "fbid:" + input[2][i];

            input[1]["specific_to_list[" + input[2].length + "]"] = "fbid:" + ctx.userID;
            input[1]["client_thread_id"] = "root:" + input[3];
        } else {
            if (input[5]) {
                input[1]["specific_to_list[0]"] = "fbid:" + input[2];
                input[1]["specific_to_list[1]"] = "fbid:" + ctx.userID;
                input[1]["other_user_fbid"] = input[2];
            } else
                input[1]["thread_fbid"] = input[2];
        }

        return http
            .post("https://www.facebook.com/messaging/send/", ctx.jar, input[1])
            .then(utils.parseAndCheckLogin(ctx, http))
            .then(function (res) {
                if (!res || res.error || res.errors)
                    throw res

                var messageInfo = res.payload.actions.reduce(function (p, v) {
                    return {
                        threadID: v.thread_fbid || v.other_user_fbid,
                        messageID: v.message_id,
                        timestamp: v.timestamp
                    }
                }, null);

                return input[4](null, messageInfo);
            });
    }

    return {
        send,
        edit,
        react,
        unsend
    }
}