var utils = require("../utils");
var mqtt = require("mqtt");
var websocket = require("websocket-stream");
var HttpsProxyAgent = require("https-proxy-agent");
var EventEmitter = require("events");
var topics = [
    "/legacy_web",
    "/webrtc",
    "/rtc_multi",
    "/onevc",
    "/br_sr",
    "/sr_res",
    "/t_ms",
    "/thread_typing",
    "/orca_typing_notifications",
    "/notify_disconnect",
    "/orca_presence",
    "/legacy_web_mtouch",
    "/t_rtc_multi",
    "/ls_foreground_state",
    "/ls_resp",
    "/inbox",
    "/mercury",
    "/messaging_events",
    "/orca_message_notifications",
    "/pp",
    "/webrtc_response"
];

function notificationConnect(ctx) {
    var next = true;
    return utils
        .get("https://www.facebook.com/notifications", ctx.jar)
        .catch(function (error) {
            if (error.type === "logout.")
                ctx.isLogin = false;

            next = false;
            console.log(error);
        })
        .finally(function () {
            if (next && ctx.listenNotif)
                return setTimeout(notificationConnect, 1000, ctx);
        });
}

function markDelivery(apis, threadID, messageID) {
    if (threadID && messageID)
        apis.markAsDelivered(threadID, messageID, error => !error ? apis.markAsRead(threadID) : null);
}

function parseAndReCallback(http, apis, ctx, globalCallback, deltails) {
    function getExtension(original_extension, fullFileName = "") {
        if (original_extension)
            return original_extension;
        else {
            var extension = fullFileName.split(".").pop();
            if (extension === fullFileName)
                return "";
            else
                return extension;
        }
    }

    function formatAttachment(attachment1, attachment2) {
        var fullFileName = attachment1.filename;
        var fileSize = Number(attachment1.fileSize || 0);
        var durationVideo = attachment1.genericMetadata ? Number(attachment1.genericMetadata.videoLength) : undefined;
        var durationAudio = attachment1.genericMetadata ? Number(attachment1.genericMetadata.duration) : undefined;
        var mimeType = attachment1.mimeType;

        attachment2 = attachment2 || { id: "", image_data: {} };
        attachment1 = attachment1.mercury || attachment1;
        var blob = attachment1.blob_attachment || attachment1.sticker_attachment;
        var type = blob && blob.__typename ? blob.__typename : attachment1.attach_type;
        if (!type && attachment1.sticker_attachment) {
            type = "StickerAttachment";
            blob = attachment1.sticker_attachment;
        } else if (!type && attachment1.extensible_attachment) {
            if (attachment1.extensible_attachment.story_attachment && attachment1.extensible_attachment.story_attachment.target && attachment1.extensible_attachment.story_attachment.target.__typename && attachment1.extensible_attachment.story_attachment.target.__typename === "MessageLocation")
                type = "MessageLocation";
            else
                type = "ExtensibleAttachment";
            blob = attachment1.extensible_attachment;
        }
        switch (type) {
            case "sticker":
                return {
                    type: "sticker",
                    ID: attachment1.metadata.stickerID.toString(),
                    url: attachment1.url,
                    packID: attachment1.metadata.packID.toString(),
                    spriteUrl: attachment1.metadata.spriteURI,
                    spriteUrl2x: attachment1.metadata.spriteURI2x,
                    width: attachment1.metadata.width,
                    height: attachment1.metadata.height,
                    caption: attachment2.caption,
                    description: attachment2.description,
                    frameCount: attachment1.metadata.frameCount,
                    frameRate: attachment1.metadata.frameRate,
                    framesPerRow: attachment1.metadata.framesPerRow,
                    framesPerCol: attachment1.metadata.framesPerCol,
                    stickerID: attachment1.metadata.stickerID.toString(),
                    spriteURI: attachment1.metadata.spriteURI,
                    spriteURI2x: attachment1.metadata.spriteURI2x
                }
            case "file":
                return {
                    type: "file",
                    ID: attachment2.id.toString(),
                    fullFileName,
                    filename: attachment1.name,
                    fileSize,
                    original_extension: getExtension(attachment1.original_extension, fullFileName),
                    mimeType,
                    url: attachment1.url,
                    isMalicious: attachment2.is_malicious,
                    contentType: attachment2.mime_type,
                    name: attachment1.name
                }
            case "photo":
                return {
                    type: "photo",
                    ID: attachment1.metadata.fbid.toString(),
                    filename: attachment1.fileName,
                    fullFileName,
                    fileSize,
                    original_extension: getExtension(attachment1.original_extension, fullFileName),
                    mimeType,
                    thumbnailUrl: attachment1.thumbnail_url,
                    previewUrl: attachment1.preview_url,
                    previewWidth: attachment1.preview_width,
                    previewHeight: attachment1.preview_height,
                    largePreviewUrl: attachment1.large_preview_url,
                    largePreviewWidth: attachment1.large_preview_width,
                    largePreviewHeight: attachment1.large_preview_height,
                    url: attachment1.metadata.url,
                    width: attachment1.metadata.dimensions.split(",")[0],
                    height: attachment1.metadata.dimensions.split(",")[1],
                    name: fullFileName
                }
            case "animated_image":
                return {
                    type: "animated_image",
                    ID: attachment2.id.toString(),
                    filename: attachment2.filename,
                    fullFileName: fullFileName,
                    original_extension: getExtension(attachment2.original_extension, fullFileName),
                    mimeType,
                    previewUrl: attachment1.preview_url,
                    previewWidth: attachment1.preview_width,
                    previewHeight: attachment1.preview_height,
                    url: attachment2.image_data.url,
                    width: attachment2.image_data.width,
                    height: attachment2.image_data.height,
                    name: attachment1.name,
                    facebookUrl: attachment1.url,
                    thumbnailUrl: attachment1.thumbnail_url,
                    rawGifImage: attachment2.image_data.raw_gif_image,
                    rawWebpImage: attachment2.image_data.raw_webp_image,
                    animatedGifUrl: attachment2.image_data.animated_gif_url,
                    animatedGifPreviewUrl: attachment2.image_data.animated_gif_preview_url,
                    animatedWebpUrl: attachment2.image_data.animated_webp_url,
                    animatedWebpPreviewUrl: attachment2.image_data.animated_webp_preview_url
                }
            case "share":
                return {
                    type: "share",
                    ID: attachment1.share.share_id.toString(),
                    url: attachment2.href,
                    title: attachment1.share.title,
                    description: attachment1.share.description,
                    source: attachment1.share.source,
                    image: attachment1.share.media.image,
                    width: attachment1.share.media.image_size.width,
                    height: attachment1.share.media.image_size.height,
                    playable: attachment1.share.media.playable,
                    duration: attachment1.share.media.duration,
                    subattachments: attachment1.share.subattachments,
                    properties: {},
                    animatedImageSize: attachment1.share.media.animated_image_size,
                    facebookUrl: attachment1.share.uri,
                    target: attachment1.share.target,
                    styleList: attachment1.share.style_list
                }
            case "video":
                return {
                    type: "video",
                    ID: attachment1.metadata.fbid.toString(),
                    filename: attachment1.name,
                    fullFileName: fullFileName,
                    original_extension: getExtension(attachment1.original_extension, fullFileName),
                    mimeType,
                    duration: durationVideo,
                    previewUrl: attachment1.preview_url,
                    previewWidth: attachment1.preview_width,
                    previewHeight: attachment1.preview_height,
                    url: attachment1.url,
                    width: attachment1.metadata.dimensions.width,
                    height: attachment1.metadata.dimensions.height,
                    videoType: "unknown",
                    thumbnailUrl: attachment1.thumbnail_url
                }
            case "error":
                return {
                    type: "error",
                    attachment1: attachment1,
                    attachment2: attachment2
                }
            case "MessageImage":
                return {
                    type: "photo",
                    ID: blob.legacy_attachment_id,
                    filename: blob.filename,
                    fullFileName,
                    fileSize,
                    original_extension: getExtension(blob.original_extension, fullFileName),
                    mimeType,
                    thumbnailUrl: blob.thumbnail.uri,
                    previewUrl: blob.preview.uri,
                    previewWidth: blob.preview.width,
                    previewHeight: blob.preview.height,
                    largePreviewUrl: blob.large_preview.uri,
                    largePreviewWidth: blob.large_preview.width,
                    largePreviewHeight: blob.large_preview.height,
                    url: blob.large_preview.uri,
                    width: blob.original_dimensions.x,
                    height: blob.original_dimensions.y,
                    name: blob.filename
                }
            case "MessageAnimatedImage":
                return {
                    type: "animated_image",
                    ID: blob.legacy_attachment_id,
                    filename: blob.filename,
                    fullFileName,
                    original_extension: getExtension(blob.original_extension, fullFileName),
                    mimeType,
                    previewUrl: blob.preview_image.uri,
                    previewWidth: blob.preview_image.width,
                    previewHeight: blob.preview_image.height,
                    url: blob.animated_image.uri,
                    width: blob.animated_image.width,
                    height: blob.animated_image.height,
                    thumbnailUrl: blob.preview_image.uri,
                    name: blob.filename,
                    facebookUrl: blob.animated_image.uri,
                    rawGifImage: blob.animated_image.uri,
                    animatedGifUrl: blob.animated_image.uri,
                    animatedGifPreviewUrl: blob.preview_image.uri,
                    animatedWebpUrl: blob.animated_image.uri,
                    animatedWebpPreviewUrl: blob.preview_image.uri
                }
            case "MessageVideo":
                return {
                    type: "video",
                    ID: blob.legacy_attachment_id,
                    filename: blob.filename,
                    fullFileName,
                    original_extension: getExtension(blob.original_extension, fullFileName),
                    fileSize: fileSize,
                    duration: durationVideo,
                    mimeType,
                    previewUrl: blob.large_image.uri,
                    previewWidth: blob.large_image.width,
                    previewHeight: blob.large_image.height,
                    url: blob.playable_url,
                    width: blob.original_dimensions.x,
                    height: blob.original_dimensions.y,
                    videoType: blob.video_type.toLowerCase(),
                    thumbnailUrl: blob.large_image.uri
                }
            case "MessageAudio":
                return {
                    type: "audio",
                    ID: blob.url_shimhash,
                    filename: blob.filename,
                    fullFileName,
                    fileSize,
                    duration: durationAudio,
                    original_extension: getExtension(blob.original_extension, fullFileName),
                    mimeType,
                    audioType: blob.audio_type,
                    url: blob.playable_url,
                    isVoiceMail: blob.is_voicemail
                }
            case "StickerAttachment":
            case "Sticker":
                return {
                    type: "sticker",
                    ID: blob.id,
                    url: blob.url,
                    packID: blob.pack ? blob.pack.id : null,
                    spriteUrl: blob.sprite_image,
                    spriteUrl2x: blob.sprite_image_2x,
                    width: blob.width,
                    height: blob.height,
                    caption: blob.label,
                    description: blob.label,
                    frameCount: blob.frame_count,
                    frameRate: blob.frame_rate,
                    framesPerRow: blob.frames_per_row,
                    framesPerCol: blob.frames_per_column,
                    stickerID: blob.id,
                    spriteURI: blob.sprite_image,
                    spriteURI2x: blob.sprite_image_2x
                }
            case "MessageLocation":
                var urlAttach = blob.story_attachment.url;
                var mediaAttach = blob.story_attachment.media;
                var u = querystring.parse(url.parse(urlAttach).query).u;
                var where1 = querystring.parse(url.parse(u).query).where1;
                var address = where1.split(", ");
                var latitude;
                var longitude;

                try {
                    latitude = Number.parseFloat(address[0]);
                    longitude = Number.parseFloat(address[1]);
                } finally { }

                var imageUrl;
                var width;
                var height;
                if (mediaAttach && mediaAttach.image) {
                    imageUrl = mediaAttach.image.uri;
                    width = mediaAttach.image.width;
                    height = mediaAttach.image.height;
                }

                return {
                    type: "location",
                    ID: blob.legacy_attachment_id,
                    latitude,
                    longitude,
                    image: imageUrl,
                    width,
                    height,
                    url: u || urlAttach,
                    address: where1,
                    facebookUrl: blob.story_attachment.url,
                    target: blob.story_attachment.target,
                    styleList: blob.story_attachment.style_list
                }
            case "ExtensibleAttachment":
                return {
                    type: "share",
                    ID: blob.legacy_attachment_id,
                    url: blob.story_attachment.url,
                    title: blob.story_attachment.title_with_entities.text,
                    description: blob.story_attachment.description && blob.story_attachment.description.text,
                    source: blob.story_attachment.source ? blob.story_attachment.source.text : null,
                    image: blob.story_attachment.media && blob.story_attachment.media.image && blob.story_attachment.media.image.uri,
                    width: blob.story_attachment.media && blob.story_attachment.media.image && blob.story_attachment.media.image.width,
                    height: blob.story_attachment.media && blob.story_attachment.media.image && blob.story_attachment.media.image.height,
                    playable: blob.story_attachment.media && blob.story_attachment.media.is_playable,
                    duration: blob.story_attachment.media && blob.story_attachment.media.playable_duration_in_ms,
                    playableUrl: !blob.story_attachment.media ? null : blob.story_attachment.media.playable_url,
                    subattachments: blob.story_attachment.subattachments,
                    properties: blob.story_attachment.properties.reduce(function (obj, cur) {
                        obj[cur.key] = cur.value.text;
                        return obj;
                    }, {}),
                    facebookUrl: blob.story_attachment.url,
                    target: blob.story_attachment.target,
                    styleList: blob.story_attachment.style_list
                }
            case "MessageFile":
                return {
                    type: "file",
                    ID: blob.message_file_fbid,
                    fullFileName,
                    filename: blob.filename,
                    fileSize,
                    mimeType: blob.mimetype,
                    original_extension: blob.original_extension || fullFileName.split(".").pop(),
                    url: blob.url,
                    isMalicious: blob.is_malicious,
                    contentType: blob.content_type,
                    name: blob.filename
                }
            default:
                throw new Error("unrecognized attach_file of type " + type + "`" + JSON.stringify(attachment1, null, 4) + " attachment2: " + JSON.stringify(attachment2, null, 4) + "`");
        }
    }

    if (deltails.class === "NewMessage") {
        function formatMessage() {
            var md = deltails.messageMetadata;
            var mdata = !deltails.data ? [] : !deltails.data.prng ? [] : JSON.parse(deltails.data.prng);
            var m_id = mdata.map(u => u.i);
            var m_offset = mdata.map(u => u.o);
            var m_length = mdata.map(u => u.l);
            var mentions = {};
            for (var i = 0; i < m_id.length; i++)
                mentions[m_id[i]] = deltails.body.substring(m_offset[i], m_offset[i] + m_length[i]);

            return {
                type: "message",
                senderID: utils.formatID(md.actorFbId.toString()),
                body: deltails.body || "",
                threadID: utils.formatID((md.threadKey.threadFbId || md.threadKey.otherUserFbId).toString()),
                messageID: md.messageId,
                attachments: (deltails.attachments || []).map(v => formatAttachment(v)),
                mentions,
                timestamp: md.timestamp,
                isGroup: !!md.threadKey.threadFbId,
                participantIDs: deltails.participants || []
            }
        }

        (function resolveAttachmentUrl(i) {
            if (i === (deltails.attachments || []).length) {
                try {
                    var message = formatMessage();
                    (message.senderID !== ctx.userID || ctx.globalOptions.listenSelf) ? globalCallback(null, message) : null;
                    if (ctx.globalOptions.autoMarkDelivery)
                        markDelivery(apis, message.threadID, message.messageID);
                } catch (error) {
                    error = {
                        error: "Problem parsing message object. Please open an issue at https://github.com/GiaKhang1810/mira-bot-v1/issues.",
                        detail: error,
                        response: deltails,
                        type: "parse_error"
                    }
                    globalCallback(error);
                }
            } else {
                if (deltails.attachments[i].mercury.attach_type === "photo") {
                    apis.resolvePhotoUrl(deltails.attachments[i].fbid, (e, u) => e ? deltails.attachments[i].mercury.metadata.url = u : null, resolveAttachmentUrl(i + 1));
                } else {
                    return resolveAttachmentUrl(i + 1);
                }
            }
        })(0);
    }

    if (deltails.class === "ClientPayload") {
        var ClientPayload = JSON.parse(String.fromCharCode.apply(null, deltails.payload));
        if (ClientPayload && ClientPayload.deltas) {
            for (var i in ClientPayload.deltas) {
                var delta = ClientPayload.deltas[i];

                if (delta.deltaMessageReaction && ctx.globalOptions.listenEvents && !!delta.deltaMessageReaction.offlineThreadingId) {
                    var reaction = {
                        type: "message_reaction",
                        threadID: (delta.deltaMessageReaction.threadKey.threadFbId ? delta.deltaMessageReaction.threadKey.threadFbId : delta.deltaMessageReaction.threadKey.otherUserFbId).toString(),
                        messageID: delta.deltaMessageReaction.messageId,
                        reaction: delta.deltaMessageReaction.reaction,
                        senderID: delta.deltaMessageReaction.senderId.toString(),
                        userID: (delta.deltaMessageReaction.userId || delta.deltaMessageReaction.senderId).toString(),
                        isGroup: !!delta.deltaMessageReaction.threadKey.threadFbId,
                    }
                    globalCallback(null, reaction);
                } else if (delta.deltaRecallMessageData && ctx.globalOptions.listenEvents) {
                    var unsend = {
                        type: "message_unsend",
                        threadID: (delta.deltaRecallMessageData.threadKey.threadFbId ? delta.deltaRecallMessageData.threadKey.threadFbId : delta.deltaRecallMessageData.threadKey.otherUserFbId).toString(),
                        messageID: delta.deltaRecallMessageData.messageID,
                        senderID: delta.deltaRecallMessageData.senderID.toString(),
                        deletionTimestamp: delta.deltaRecallMessageData.deletionTimestamp,
                        timestamp: delta.deltaRecallMessageData.timestamp
                    }
                    globalCallback(null, unsend);
                } else if (delta.deltaRemoveMessage && ctx.globalOptions.listenEvents) {
                    var del = {
                        type: "message_self_delete",
                        threadID: (delta.deltaRemoveMessage.threadKey.threadFbId ? delta.deltaRemoveMessage.threadKey.threadFbId : delta.deltaRemoveMessage.threadKey.otherUserFbId).toString(),
                        messageID: delta.deltaRemoveMessage.messageIds.length === 1 ? delta.deltaRemoveMessage.messageIds[0] : delta.deltaRemoveMessage.messageIds,
                        senderID: ctx.userID,
                        deletionTimestamp: delta.deltaRemoveMessage.deletionTimestamp,
                        timestamp: delta.deltaRemoveMessage.timestamp
                    }
                    globalCallback(null, del);
                } else if (delta.deltaMessageReply) {
                    var mdata = !delta.deltaMessageReply.message ? [] : !delta.deltaMessageReply.message.data ? [] : !delta.deltaMessageReply.message.data.prng ? [] : JSON.parse(delta.deltaMessageReply.message.data.prng);
                    var m_id = mdata.map(u => u.i);
                    var m_offset = mdata.map(u => u.o);
                    var m_length = mdata.map(u => u.l);
                    var mentions = {}

                    for (var i = 0; i < m_id.length; i++)
                        mentions[m_id[i]] = (delta.deltaMessageReply.message.body || "").substring(m_offset[i], m_offset[i] + m_length[i]);

                    var callbackToReturn = {
                        type: "message_reply",
                        threadID: (delta.deltaMessageReply.message.messageMetadata.threadKey.threadFbId ? delta.deltaMessageReply.message.messageMetadata.threadKey.threadFbId : delta.deltaMessageReply.message.messageMetadata.threadKey.otherUserFbId).toString(),
                        messageID: delta.deltaMessageReply.message.messageMetadata.messageId,
                        senderID: delta.deltaMessageReply.message.messageMetadata.actorFbId.toString(),
                        attachments: (delta.deltaMessageReply.message.attachments || []).map(att => {
                            var mercury = JSON.parse(att.mercuryJSON);
                            Object.assign(att, mercury);
                            return att;
                        }).map(att => {
                            var x;
                            try {
                                x = formatAttachment(att);
                            } catch (ex) {
                                x = att;
                                x.error = ex;
                                x.type = "unknown";
                            }
                            return x;
                        }),
                        body: delta.deltaMessageReply.message.body || "",
                        isGroup: !!delta.deltaMessageReply.message.messageMetadata.threadKey.threadFbId,
                        mentions,
                        timestamp: delta.deltaMessageReply.message.messageMetadata.timestamp,
                        participantIDs: (delta.deltaMessageReply.message.messageMetadata.cid.canonicalParticipantFbids || delta.deltaMessageReply.message.participants || []).map(e => e.toString())
                    }

                    if (delta.deltaMessageReply.repliedToMessage) {
                        mdata = !delta.deltaMessageReply.repliedToMessage ? [] : !delta.deltaMessageReply.repliedToMessage.data ? [] : !delta.deltaMessageReply.repliedToMessage.data.prng ? [] : JSON.parse(delta.deltaMessageReply.repliedToMessage.data.prng);
                        m_id = mdata.map(u => u.i);
                        m_offset = mdata.map(u => u.o);
                        m_length = mdata.map(u => u.l);
                        var rmentions = {}

                        for (var i = 0; i < m_id.length; i++)
                            rmentions[m_id[i]] = (delta.deltaMessageReply.repliedToMessage.body || "").substring(m_offset[i], m_offset[i] + m_length[i]);

                        callbackToReturn.messageReply = {
                            threadID: (delta.deltaMessageReply.repliedToMessage.messageMetadata.threadKey.threadFbId ? delta.deltaMessageReply.repliedToMessage.messageMetadata.threadKey.threadFbId : delta.deltaMessageReply.repliedToMessage.messageMetadata.threadKey.otherUserFbId).toString(),
                            messageID: delta.deltaMessageReply.repliedToMessage.messageMetadata.messageId,
                            senderID: delta.deltaMessageReply.repliedToMessage.messageMetadata.actorFbId.toString(),
                            attachments: delta.deltaMessageReply.repliedToMessage.attachments.map(att => {
                                var mercury = JSON.parse(att.mercuryJSON);
                                Object.assign(att, mercury);
                                return att;
                            }).map(att => {
                                var x;
                                try {
                                    x = formatAttachment(att);
                                } catch (ex) {
                                    x = att;
                                    x.error = ex;
                                    x.type = "unknown";
                                }
                                return x;
                            }),
                            body: delta.deltaMessageReply.repliedToMessage.body || "",
                            isGroup: !!delta.deltaMessageReply.repliedToMessage.messageMetadata.threadKey.threadFbId,
                            mentions: rmentions,
                            timestamp: delta.deltaMessageReply.repliedToMessage.messageMetadata.timestamp
                        };
                    } else if (delta.deltaMessageReply.replyToMessageId) {
                        return http
                            .post("https://www.facebook.com/api/graphqlbatch/", ctx.jar, {
                                queries: JSON.stringify({
                                    o0: {
                                        doc_id: "2848441488556444",
                                        query_params: {
                                            thread_and_message_id: {
                                                thread_id: callbackToReturn.threadID,
                                                message_id: delta.deltaMessageReply.replyToMessageId.id
                                            }
                                        }
                                    }
                                })
                            })
                            .then(utils.parseAndCheckLogin(ctx, http))
                            .then(res => {
                                if (res[res.length - 1].error_results > 0)
                                    throw res[0].o0.errors;


                                if (res[res.length - 1].successful_results === 0)
                                    throw { error: "forcedFetch: there was no successful_results", response: res };

                                var fetchData = res[0].o0.data.message;
                                var mobj = {}
                                for (var n in fetchData.message.ranges)
                                    mobj[fetchData.message.ranges[n].entity.id] = (fetchData.message.text || "").substr(fetchData.message.ranges[n].offset, fetchData.message.ranges[n].length);


                                callbackToReturn.messageReply = {
                                    threadID: callbackToReturn.threadID,
                                    messageID: fetchData.message_id,
                                    senderID: fetchData.message_sender.id.toString(),
                                    attachments: fetchData.message.blob_attachment.map(att => {
                                        var x;
                                        try {
                                            x = formatAttachment({ blob_attachment: att });
                                        } catch (ex) {
                                            x = att;
                                            x.error = ex;
                                            x.type = "unknown";
                                        }
                                        return x;
                                    }),
                                    body: fetchData.message.text || "",
                                    isGroup: callbackToReturn.isGroup,
                                    mentions: mobj,
                                    timestamp: parseInt(fetchData.timestamp_precise)
                                };
                            })
                            .catch(console.log)
                            .finally(function () {
                                if (ctx.globalOptions.autoMarkDelivery)
                                    markDelivery(apis, callbackToReturn.threadID, callbackToReturn.messageID);

                                (callbackToReturn.senderID !== ctx.userID || ctx.globalOptions.listenSelf) ? globalCallback(null, callbackToReturn) : null;
                            });
                    } else
                        callbackToReturn.delta = delta;

                    if (ctx.globalOptions.autoMarkDelivery)
                        markDelivery(apis, callbackToReturn.threadID, callbackToReturn.messageID);

                    return (callbackToReturn.senderID !== ctx.userID || ctx.globalOptions.listenSelf) ? globalCallback(null, callbackToReturn) : null;
                }
            }
            return;
        }
    }

    if (deltails.class !== "NewMessage" && !ctx.globalOptions.listenEvents)
        return;

    function getAdminTextMessageType(type) {
        switch (type) {
            case 'unpin_messages_v2':
                return 'log:unpin-message';
            case 'pin_messages_v2':
                return 'log:pin-message';
            case "change_thread_theme":
                return "log:thread-color";
            case "change_thread_icon":
                return "log:thread-icon";
            case "change_thread_nickname":
                return "log:user-nickname";
            case "change_thread_admins":
                return "log:thread-admins";
            case "group_poll":
                return "log:thread-poll";
            case "change_thread_approval_mode":
                return "log:thread-approval-mode";
            case "messenger_call_log":
            case "participant_joined_group_call":
                return "log:thread-call";
            default:
                return type;
        }
    }

    function getAdminTextMessageType(type) {
        switch (type) {
            case 'unpin_messages_v2':
                return 'log:unpin-message';
            case 'pin_messages_v2':
                return 'log:pin-message';
            case "change_thread_theme":
                return "log:thread-color";
            case "change_thread_icon":
                return "log:thread-icon";
            case "change_thread_nickname":
                return "log:user-nickname";
            case "change_thread_admins":
                return "log:thread-admins";
            case "group_poll":
                return "log:thread-poll";
            case "change_thread_approval_mode":
                return "log:thread-approval-mode";
            case "messenger_call_log":
            case "participant_joined_group_call":
                return "log:thread-call";
            default:
                return type;
        }
    }
    function formatDeltaEvent() {
        var logMessageType;
        var logMessageData;
        switch (deltails.class) {
            case "AdminTextMessage":
                logMessageData = deltails.untypedData;
                logMessageType = getAdminTextMessageType(deltails.type);
                break;
            case "ThreadName":
                logMessageType = "log:thread-name";
                logMessageData = { name: deltails.name };
                break;
            case "ParticipantsAddedToGroupThread":
                logMessageType = "log:subscribe";
                logMessageData = { addedParticipants: deltails.addedParticipants };
                break;
            case "ParticipantLeftGroupThread":
                logMessageType = "log:unsubscribe";
                logMessageData = { leftParticipantFbId: deltails.leftParticipantFbId };
                break;
            case "ApprovalQueue":
                logMessageType = "log:approval-queue";
                logMessageData = {
                    approvalQueue: {
                        action: deltails.action,
                        recipientFbId: deltails.recipientFbId,
                        requestSource: deltails.requestSource,
                        ...deltails.messageMetadata
                    }
                }
        }

        return {
            type: "event",
            threadID: utils.formatID((deltails.messageMetadata.threadKey.threadFbId || deltails.messageMetadata.threadKey.otherUserFbId).toString()),
            messageID: deltails.messageMetadata.messageId.toString(),
            logMessageType: logMessageType,
            logMessageData: logMessageData,
            logMessageBody: deltails.messageMetadata.adminText,
            timestamp: deltails.messageMetadata.timestamp,
            author: deltails.messageMetadata.actorFbId,
            participantIDs: deltails.participants,
            isGroup: !!deltails.participants
        }
    }
    switch (deltails.class) {
        case "ReadReceipt":
            try {
                var readReceipt = {
                    reader: (deltails.threadKey.otherUserFbId || deltails.actorFbId).toString(),
                    time: deltails.actionTimestampMs,
                    threadID: utils.formatID((deltails.threadKey.otherUserFbId || deltails.threadKey.threadFbId).toString()),
                    type: "read_receipt"
                }
                globalCallback(null, readReceipt);
            } catch (error) {
                error = {
                    error: "Problem parsing message object. Please open an issue at https://github.com/GiaKhang1810/mira-bot-v1/issues.",
                    detail: error,
                    response: deltails,
                    type: "parse_error"
                }
                globalCallback(error);
            }
            break;
        case "AdminTextMessage":
            switch (deltails.type) {
                case "change_thread_theme":
                case "change_thread_nickname":
                case "change_thread_icon":
                case "change_thread_quick_reaction":
                case "change_thread_admins":
                case "group_poll":
                case "joinable_group_link_mode_change":
                case "magic_words":
                case "change_thread_approval_mode":
                case "messenger_call_log":
                case "participant_joined_group_call":
                    try {
                        var detailsEvent = formatDeltaEvent();
                        globalCallback(null, detailsEvent);
                    } catch (error) {
                        error = {
                            error: "Problem parsing message object. Please open an issue at https://github.com/GiaKhang1810/mira-bot-v1/issues.",
                            detail: error,
                            response: deltails,
                            type: "parse_error"
                        }
                    }
                    break;
                default:
                    break;
            }
            break;
        case "ForcedFetch":
            if (!deltails.threadKey)
                return;
            var mid = deltails.messageId;
            var tid = deltails.threadKey.threadFbId;
            if (mid && tid) {
                var form = {
                    queries: JSON.stringify({
                        o0: {
                            doc_id: "2848441488556444",
                            query_params: {
                                thread_and_message_id: {
                                    thread_id: tid.toString(),
                                    message_id: mid
                                }
                            }
                        }
                    })
                }

                http
                    .post("https://www.facebook.com/api/graphqlbatch/", ctx.jar, form)
                    .then(utils.parseAndCheckLogin(ctx, http))
                    .then(res => {
                        if (res[res.length - 1].error_results > 0)
                            throw res[0].o0.errors;
                        if (res[res.length - 1].successful_results === 0)
                            throw { error: "forcedFetch: there was no successful_results", response: res }

                        var fetchData = res[0].o0.data.message;
                        if (utils.getType(fetchData) !== "Object")
                            return;

                        switch (fetchData.__typename) {
                            case "ThreadImageMessage":
                                (fetchData.message_sender.id.toString() !== ctx.userID || ctx.globalOptions.listenEventsSelf) ? globalCallback(null, {
                                    type: "event",
                                    threadID: utils.formatID(tid.toString()),
                                    messageID: fetchData.message_id,
                                    logMessageType: "log:thread-image",
                                    logMessageData: {
                                        attachmentID: fetchData.image_with_metadata && fetchData.image_with_metadata.legacy_attachment_id,
                                        width: fetchData.image_with_metadata && fetchData.image_with_metadata.original_dimensions.x,
                                        height: fetchData.image_with_metadata && fetchData.image_with_metadata.original_dimensions.y,
                                        url: fetchData.image_with_metadata && fetchData.image_with_metadata.preview.uri
                                    },
                                    logMessageBody: fetchData.snippet,
                                    timestamp: fetchData.timestamp_precise,
                                    author: fetchData.message_sender.id
                                }) : null;
                                break;
                            case "UserMessage":
                                globalCallback(null, {
                                    type: "message",
                                    senderID: utils.formatID(fetchData.message_sender.id),
                                    body: fetchData.message.text || "",
                                    threadID: utils.formatID(tid.toString()),
                                    messageID: fetchData.message_id,
                                    attachments: [{
                                        type: "share",
                                        ID: fetchData.extensible_attachment.legacy_attachment_id,
                                        url: fetchData.extensible_attachment.story_attachment.url,

                                        title: fetchData.extensible_attachment.story_attachment.title_with_entities.text,
                                        description: fetchData.extensible_attachment.story_attachment.description.text,
                                        source: fetchData.extensible_attachment.story_attachment.source,

                                        image: ((fetchData.extensible_attachment.story_attachment.media || {}).image || {}).uri,
                                        width: ((fetchData.extensible_attachment.story_attachment.media || {}).image || {}).width,
                                        height: ((fetchData.extensible_attachment.story_attachment.media || {}).image || {}).height,
                                        playable: (fetchData.extensible_attachment.story_attachment.media || {}).is_playable || false,
                                        duration: (fetchData.extensible_attachment.story_attachment.media || {}).playable_duration_in_ms || 0,

                                        subattachments: fetchData.extensible_attachment.subattachments,
                                        properties: fetchData.extensible_attachment.story_attachment.properties
                                    }],
                                    mentions: {},
                                    timestamp: parseInt(fetchData.timestamp_precise),
                                    participantIDs: (fetchData.participants || (fetchData.messageMetadata ? fetchData.messageMetadata.cid ? fetchData.messageMetadata.cid.canonicalParticipantFbids : fetchData.messageMetadata.participantIds : []) || []),
                                    isGroup: (fetchData.message_sender.id != tid.toString())
                                });
                                break;
                        }
                    })
                    .catch(console.log);
            }
            break;
        case "ThreadName":
        case "ParticipantsAddedToGroupThread":
        case "ParticipantLeftGroupThread":
        case "ApprovalQueue":
            try {
                var detailsEvent = formatDeltaEvent();
                globalCallback(null, detailsEvent);
            } catch (error) {
                error = {
                    error: "Problem parsing message object. Please open an issue at https://github.com/ntkhang03/fb-chat-api/issues.",
                    detail: error,
                    response: deltails,
                    type: "parse_error"
                }
                globalCallback(error);
            }
            break;
    }
}

function connectClientWs(http, apis, ctx, globalCallback) {
    var chatOn = ctx.globalOptions.online;
    var foreground = false;
    var sessionID = Math.floor(Math.random() * 9007199254740991) + 1;
    var username = JSON.stringify({
        u: ctx.userID,
        s: sessionID,
        chat_on: chatOn,
        fg: foreground,
        d: utils.getGUID(),
        ct: "websocket",
        aid: "219994525426954",
        mqtt_sid: "",
        cp: 3,
        ecp: 10,
        st: [],
        pm: [],
        dc: "",
        no_auto_fg: true,
        gas: null,
        pack: [],
        a: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (Kbody, like Gecko) Chrome/127.0.0.0 Safari/537.36",
        aids: null
    });
    var host = ctx.endpoint ? ctx.endpoint + "&sid=" + sessionID : ctx.region ? "wss://edge-chat.facebook.com/chat?region=" + ctx.region.toLocaleLowerCase() + "&sid=" + sessionID : "wss://edge-chat.facebook.com/chat?sid=" + sessionID;
    var options = {
        clientId: "mqttwsclient",
        protocolId: "MQIsdp",
        protocolVersion: 3,
        username,
        clean: true,
        wsOptions: {
            headers: {
                "Cookie": ctx.jar.getCookies("https://www.facebook.com").join("; "),
                "Origin": "https://www.facebook.com",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (Kbody, like Gecko) Chrome/127.0.0.0 Safari/537.36",
                "Referer": "https://www.facebook.com/",
                "Host": new URL(host).hostname
            },
            origin: "https://www.facebook.com",
            protocolVersion: 13
        },
        keepalive: 10,
        reschedulePings: true
    }

    if (ctx.proxy) {
        var agent = new HttpsProxyAgent(ctx.globalOptions.proxy);
        options.wsOptions.agent = agent;
    }

    ctx.Client = new mqtt.Client(_ => websocket(host, options.wsOptions), options);
    var Client = ctx.Client;
    Client
        .on("error", function (error) {
            if (error.message === "Invalid header flag bits, must be 0x0 for puback packet")
                return;
            if (ctx.Client)
                ctx.Client.end(false, _ => ctx.Client = null);
            if (ctx.globalOptions.autoReconnect) {
                return getSeqID(http, apis, ctx, globalCallback);
            }
            error = {
                type: "disconnect",
                message: "Connection refused: Server unavailable",
                error
            }
            globalCallback(error);
        })
        .on("close", _ => { })
        .on("connect", function () {
            topics.map(topic => Client.subscribe(topic));

            var topic;
            var queue = {
                sync_api_version: 10,
                max_deltas_able_to_process: 1000,
                delta_batch_size: 500,
                encoding: "JSON",
                entity_fbid: ctx.userID
            }

            if (ctx.syncToken) {
                topic = "/messenger_sync_get_diffs";
                queue.last_seq_id = ctx.lastSeqID;
                queue.sync_token = ctx.syncToken;
            } else {
                topic = "/messenger_sync_create_queue";
                queue.initial_titan_sequence_id = ctx.lastSeqID;
                queue.device_params = null;
            }

            Client.publish(topic, JSON.stringify(queue), { qos: 1, retain: false });
            Client.publish("/foreground_state", JSON.stringify({ foreground: chatOn }), { qos: 1 });
            Client.publish("/set_client_settings", JSON.stringify({ make_user_available_when_in_foreground: true }), { qos: 1 });
            ctx.listenNotif ? notificationConnect(ctx) : null;
        })
        .on("message", function (topic, message) {
            var Message = JSON.parse(Buffer.from(message).toString());
            if (Message.type === "jewel_requests_add") {
                globalCallback(null, {
                    type: "friend_request_received",
                    actorFbId: Message.frodeltails.toString(),
                    timestamp: Date.now().toString()
                });
            }
            else if (Message.type === "jewel_requests_remove_old") {
                globalCallback(null, {
                    type: "friend_request_cancel",
                    actorFbId: Message.frodeltails.toString(),
                    timestamp: Date.now().toString()
                });
            }
            else if (topic === "/t_ms") {
                if (Message.firstDeltaSeqId && Message.syncToken) {
                    ctx.lastSeqID = Message.firstDeltaSeqId;
                    ctx.syncToken = Message.syncToken;
                }

                if (Message.lastIssuedSeqId) {
                    ctx.lastSeqID = parseInt(Message.lastIssuedSeqId);
                }

                for (var i in Message.deltas) {
                    var deltails = Message.deltas[i];
                    parseAndReCallback(http, apis, ctx, globalCallback, deltails);
                }
            } else if (topic === "/thread_typing" || topic === "/orca_typing_notifications") {
                var typ = {
                    type: "typ",
                    isTyping: !!Message.state,
                    from: Message.sender_fbid.toString(),
                    threadID: utils.formatID((Message.thread || Message.sender_fbid).toString())
                };
                globalCallback(null, typ);
            } else if (topic === "/orca_presence") {
                if (!ctx.globalOptions.updatePresence) {
                    for (var i in Message.list) {
                        var data = Message.list[i];
                        var userID = data["u"];

                        var presence = {
                            type: "presence",
                            userID: userID.toString(),
                            timestamp: data["l"] * 1000,
                            statuses: data["p"]
                        }
                        globalCallback(null, presence);
                    }
                }
            } else if (Message.type === "notifications_seen") {
                var notif = {
                    type: "notification",
                    alertIDs: Message.alert_ids,
                    graphQLIDs: Message.graphql_ids,
                    notiGraphQLIDs: Message.notif_graphql_ids,
                    timestamp: Date.now().toString()
                }
                globalCallback(null, notif);
            }
        });
}

function getSeqID(http, apis, ctx, globalCallback) {
    var form = {
        av: void 0,
        queries: JSON.stringify({
            o0: {
                doc_id: "3336396659757871",
                query_params: {
                    limit: 1,
                    before: null,
                    tags: ["INBOX"],
                    includeDeliveryReceipts: false,
                    includeSeqID: true
                }
            }
        })
    }

    http
        .post("https://www.facebook.com/api/graphqlbatch/", ctx.jar, form)
        .then(utils.parseAndCheckLogin(ctx, http))
        .then(function (res) {
            if (!Array.isArray(res)) 
                throw { error: "logout.", res }
            if (res && res[res.length - 1].error_results > 0) 
                throw res[0].o0.errors;
            if (res[res.length - 1].successful_results === 0) 
                throw { error: "getSeqId: there was no successful_results", res }
            if (res[0].o0.data.viewer.message_threads.sync_sequence_id) {
                ctx.lastSeqID = res[0].o0.data.viewer.message_threads.sync_sequence_id;
                connectClientWs(http, apis, ctx, globalCallback);
            } else {
                var error = new Error("seqID is undefined.");
                error.type = "logout.";
                throw error;
            }
        })
        .catch(function (error) {
            if (error.type === "logout.")
                ctx.isLogin = false;
            console.log(error);
            return globalCallback(error);
        });
}

module.exports = function (http, apis, ctx) {
    var globalCallback;
    return class Client extends EventEmitter {
        constructor() {
            super();

            globalCallback = (error, message) => error ? this.emit("error", error) : this.emit("message", message);
            getSeqID(http, apis, ctx, globalCallback);
            return this;
        }

        disconnect() {
            globalCallback = () => { }
            if (ctx.Client)
                ctx.Client.end(false, _ => ctx.Client = null);

            return this;
        }

        reconnect() {
            this.disconnect();
            globalCallback = (error, message) => error ? this.emit("error", error) : this.emit("message", message);
            getSeqID(http, apis, ctx, globalCallback);
            return this;
        }
    }
}
