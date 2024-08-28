var { apis } = global.mira;
var log = require("../../lib/log");
var { getType } = require("../../lib/utils");

module.exports = async function ThreadDataBase(Client) {
    var ThreadShema = new Client.Schema({
        threadID: {
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

    ThreadShema.pre("save", function (next) {
        this.updatedAt = Date.now();
        next();
    });
    var Thread = Client.model("Thread", ThreadShema);

    function getAll() {
        return Thread.find();
    }

    function find(conditions = {}) {
        if (getType(conditions) !== "Object")
            throw new Error("conditions must be an JSON Object.");

        return Thread.find(conditions);
    }

    async function getInfo(threadID) {
        if (isNaN(parseInt(threadID)))
            throw new Error("threadID must be a string number.");

        var infoObj = await apis.getThreadInfo(threadID);
        return infoObj;
    }

    async function findOne(threadID) {
        if (isNaN(parseInt(threadID)))
            throw new Error("threadID must be a string number.");

        var thread = await Thread.findOne({ threadID });
        if (!thread) {
            await createData(threadID);
            thread = await findOne(threadID);
        }

        return thread;
    }

    async function createData(threadID) {
        var info = await getInfo(threadID);
        var infoObj = {
            threadID,
            name: info.name,
            money: 0,
            info,
            data: {},
            banAt: 0,
            reason: null
        }
        delete infoObj.info.name;
        await Thread.findOneAndUpdate({ threadID }, infoObj, { upsert: true, new: true });
        log.info("database.create.success", threadID);
        return;
    }

    async function setData(threadID, data) {
        if (isNaN(parseInt(threadID)))
            throw new Error("threadID must be a string number.");
        if (getType(data) !== "Object")
            throw new Error("data must be an JSON Object.");

        await Thread.updateOne({ threadID }, { $set: data });
        return;
    }

    async function setDataAll(data, conditions = {}) {
        if (getType(conditions) !== "Object")
            throw new Error("conditions must be an JSON Object.");
        if (getType(data) !== "Object")
            throw new Error("data must be an JSON Object.");

        await Thread.updateMany(conditions, { $set: data });
        return;
    }

    async function deleteThread(threadID) {
        if (isNaN(parseInt(threadID)))
            throw new Error("threadID must be a string number.");
        await Thread.deleteOne({ threadID });
        return;
    }

    log.info("database.model", "Thread.mongodb");
    return global.database.model.Thread = {
        getAll,
        find,
        findOne,
        setData,
        setDataAll,
        deleteThread
    }
}