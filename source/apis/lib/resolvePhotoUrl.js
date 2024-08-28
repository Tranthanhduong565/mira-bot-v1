var utils = require("../utils");

module.exports = function (http, apis, ctx) {
  function getPhotoUrls(photoIDs) {
    var callback;
    var uploads = [];
    var returnPromise = new Promise(function (resolve, reject) {
      callback = (error, photoUrl) => photoUrl ? resolve(photoUrl) : reject(error);
    });

    photoIDs.map(function (id) {
      var httpPromise = http
        .get("https://www.facebook.com/mercury/attachments/photo", ctx.jar, {
          photo_id: id
        })
        .then(utils.parseAndCheckLogin(ctx, http))
        .then(function (res) {
          if (res.error) throw res;
          return res.jsmods.require[0][3][0]
        })
        .catch(function (error) {
          return callback(error);
        });
      uploads.push(httpPromise);
    });

    Promise
      .all(uploads)
      .then(function (res) {
        return callback(null, res.reduce(function (form, v, i) {
          form[photoIDs[i]] = v;
          return form;
        }, {}));
      })

    return returnPromise;
  }
  
  return function resolvePhotoUrl(photoIDs, callback) {
    var pCallback;
    var returnPromise = new Promise(function (resolve, reject) {
      pCallback = (error, photoUrl) => photoUrl ? resolve(photoUrl) : reject(error);
    });

    if (!Array.isArray(photoIDs)) photoIDs = [photoIDs];
    if (typeof callback !== 'function') callback = pCallback;

    getPhotoUrls(photoIDs)
      .then(function (photoUrl) {
        if (Object.keys(photoUrl).length == 1) {
          callback(null, photoUrl[photoIDs[0]]);
        } else callback(null, photoUrl);
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