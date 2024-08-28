var utils = require("../utils");

module.exports = function (http, apis, ctx) {
  return function changeBio(bio, publish, callback) {
    var pCallback;
    var returnPromise = new Promise(function (resolve, reject) {
      pCallback = error => error ? reject(error) : resolve();
    });

    if (typeof bio === "function") {
      callback = bio;
      bio = "";
    }
    if (typeof bio === "boolean") {
      publish = bio;
      bio = "";
    }
    if (typeof publish === "function") {
      callback = publish;
      publish = false;
    }
    if (typeof publish !== "boolean") 
        publish = false;
    if (typeof callback !== "function") 
        callback = pCallback;

    var form = {
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "ProfileCometSetBioMutation",
      doc_id: "2725043627607610",
      variables: JSON.stringify({
        input: {
          bio,
          publish_bio_feed_story: publish,
          actor_id: ctx.userID,
          client_mutation_id: Math.round(Math.random() * 1024).toString()
        },
        hasProfileTileViewID: false,
        profileTileViewID: null,
        scale: 1
      })
    }

    http
      .post("https://www.facebook.com/api/graphql/", ctx.jar, form)
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

    return returnPromise;
  }
}