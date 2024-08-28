var { apis } = global.mira;
var log = require("../../lib/log");
var { getType } = require("../../lib/utils");

module.exports = async function UserDataBase(Client) {
    var UserShema = new Client.Schema({
        userID: {
            type: Client.Schema.Types.Decimal128,
            unique: true,
            required: true
        },
        name: {
            type: String,
            required: true,
            validate: {
                validator: v => v && v.trim().length > 0,
                message: "Name must not be empty"
            }
        },
        money: {
            type: Client.Schema.Types.Decimal128,
            default: 0,
            validate: {
                validator: v => Number.isInteger(v) && v >= 0,
                message: "Money must be a non-negative integer"
            }
        },
        info: {
            type: Client.Schema.Types.Mixed,
            validate: {
                validator: function (v) {
                    try {
                        JSON.stringify(v);
                        return true;
                    } catch (e) {
                        return false;
                    }
                },
                message: "Info must be a valid JSON object"
            }
        },
        data: {
            type: Client.Schema.Types.Mixed,
            validate: {
                validator: function (v) {
                    try {
                        JSON.stringify(v);
                        return true;
                    } catch (e) {
                        return false;
                    }
                },
                message: "Data must be a valid JSON object"
            }
        },
        banAt: {
            type: Number,
            default: 0,
            validate: {
                validator: v => Number.isInteger(v) && v >= 0,
                message: "banAt must be a non-negative integer"
            }
        },
        reason: {
            type: String,
            required: false,
            validate: {
                validator: v => (!v || v.trim().length > 0),
                message: "Reason must not be empty if providedy"
            }
        }
    }, {
        timestamps: true
    });

    UserShema.pre("save", function (next) {
        this.updatedAt = Date.now();
        next();
    });
    var User = Client.model("User", UserShema);

    function getAll() {
        return User.find();
    }

    function find(conditions = {}) {
        if (getType(conditions) !== "Object")
            throw new Error("conditions must be an JSON Object.");

        return User.find(conditions);
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

        var user = await User.findOne({ userID });
        if (!user) {
            await createData(userID);
            user = await findOne(userID);
        }

        return user;
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
        await User.findOneAndUpdate({ userID }, infoObj, { upsert: true, new: true });
        log.info("database.create.success", userID);
        return;
    }

    async function setData(userID, data) {
        if (isNaN(parseInt(userID)))
            throw new Error("userID must be a string number.");
        if (getType(data) !== "Object")
            throw new Error("data must be an JSON Object.");

        await User.updateOne({ userID }, { $set: data });
        return;
    }

    async function setDataAll(data, conditions = {}) {
        if (getType(conditions) !== "Object")
            throw new Error("conditions must be an JSON Object.");
        if (getType(data) !== "Object")
            throw new Error("data must be an JSON Object.");

        await User.updateMany(conditions, { $set: data });
        return;
    }

    async function deleteUser(userID) {
        if (isNaN(parseInt(userID)))
            throw new Error("userID must be a string number.");
        await User.deleteOne({ userID });
        return;
    }

    log.info("database.model", "User.mongodb");
    return global.database.model.User = {
        getAll,
        find,
        findOne,
        setData,
        setDataAll,
        deleteUser
    }
}