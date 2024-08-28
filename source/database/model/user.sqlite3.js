var { apis } = global.mira;
var log = require("../../lib/log");
var { getType } = require("../../lib/utils");

module.exports = async function UserDataBase(SQL, sql) {
    var User = SQL.define("User", {
        userID: {
            type: sql.BIGINT,
            unique: true
        },
        name: {
            type: sql.STRING,
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        money: {
            type: sql.BIGINT,
            defaultValue: 0,
            validate: {
                isInt: true,
                min: 0
            }
        },
        info: {
            type: sql.JSON,
            validate: {
                isJSON: value => JSON.stringify(value)
            }
        },
        data: {
            type: sql.JSON,
            validate: {
                isJSON: value => JSON.stringify(value)
            }
        },
        banAt: {
            type: sql.BIGINT,
            defaultValue: 0,
            validate: {
                isInt: true,
                min: 0
            }
        },
        reason: {
            type: sql.STRING,
            allowNull: true,
            validate: {
                notEmpty: true
            }
        }
    });

    User.sync({ force: false });

    function getAll() {
        return User.findAll();
    }

    function find(conditions = {}) {
        if (getType(conditions) !== "Object") 
            throw new Error("conditions must be an JSON Object.");

        return User.findAll({ where: conditions });
    }

    async function getInfo(userID) {
        if (isNaN(parseInt(userID))) 
            throw new Error("userID must be a string number.");

        var infoObj = await apis.getUserInfo(userID);
        return infoObj[userID] || {}
    }

    async function findOne(userID) {
        if (isNaN(parseInt(userID))) 
            throw new Error("userID must be a string number.");

        var userData = await User.findOne({ where: { userID } });
        if (!userData) {
            await createData(userID);
            return await findOne(userID);
        }

        return userData.get({ plain: true });
    }

    async function createData(userID) {
        var info = await getInfo(userID);
        var infoObj = {
            userID,
            name: info.name || "User",
            money: 0,
            info,
            data: {},
            banAt: 0,
            reason: null
        }
        delete infoObj.info.name;
        await User.findOrCreate({ where: { userID }, defaults: infoObj });
        log.info("database.create.success", userID);
        return;
    }

    async function setData(userID, data) {
        if (isNaN(parseInt(userID))) 
            throw new Error("userID must be a string number.");
        if (getType(data) !== "Object") 
            throw new Error("data must be an JSON Object.");

        await User.update(data, { where: { userID } });
        return;
    }

    async function setDataAll(data, conditions = {}) {
        if (getType(conditions) !== "Object") 
            throw new Error("conditions must be an JSON Object.");
        if (getType(data) !== "Object") 
            throw new Error("data must be an JSON Object.");

        await User.update(data, { where: conditions });
        return;
    }

    async function deleteUser(userID) {
        if (isNaN(parseInt(userID))) 
            throw new Error("userID must be a string number.");
        await User.destroy({ where: { userID } });
        return;
    }

    log.info("database.model", "User.sqlite3");
    return global.database.model.User = {
        getAll,
        find,
        findOne,
        setData,
        setDataAll,
        deleteUser
    }
}