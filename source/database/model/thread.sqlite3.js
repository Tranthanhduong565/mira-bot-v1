var { apis } = global.mira;
var log = require("../../lib/log");
var { getType } = require("../../lib/utils");

module.exports = async function ThreadDataBase(SQL, sql) {
    var Thread = SQL.define("Thread", {
        threadID: {
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

    Thread.sync({ force: false });

    function getAll() {
        return Thread.findAll();
    }

    function find(conditions = {}) {
        if (getType(conditions) !== "Object") 
            throw new Error("conditions must be an JSON Object.");

        return Thread.findAll({ where: conditions });
    }

    async function getInfo(threadID) {
        if (isNaN(parseInt(threadID))) 
            throw new Error("ThreadID must be a string number.");

        var infoObj = await apis.getThreadInfo(threadID);
        return infoObj;
    }

    async function findOne(threadID) {
        if (isNaN(parseInt(threadID))) 
            throw new Error("ThreadID must be a string number.");

        var threadData = await Thread.findOne({ where: { threadID } });
        if (!threadData) {
            await createData(threadID);
            return await findOne(threadID);
        }

        return threadData.get({ plain: true });
    }

    async function createData(threadID) {
        var info = await getInfo(threadID);
        info.adminIDs = info.adminIDs.map(item => item.id);
        var infoObj = {
            threadID,
            name: info.name || "Unknown",
            money: 0,
            info,
            data: {}
        }
        delete infoObj.info.name;
        await Thread.findOrCreate({ where: { threadID }, defaults: infoObj });
        log.info("database.create.success", threadID);
        return;
    }

    async function setData(threadID, data) {
        if (isNaN(parseInt(threadID))) 
            throw new Error("ThreadID must be a string number.");
        if (getType(data) !== "Object") 
            throw new Error("data must be an JSON Object.");

        await Thread.update(data, { where: { threadID } });
        return;
    }

    async function setDataAll(data, conditions = {}) {
        if (getType(conditions) !== "Object") 
            throw new Error("conditions must be an JSON Object.");
        if (getType(data) !== "Object") 
            throw new Error("data must be an JSON Object.");

        await Thread.update(data, { where: conditions });
        return;
    }

    async function deleteData(threadID) {
        if (isNaN(parseInt(threadID))) 
            throw new Error("threadID must be a string number.");
        await Thread.destroy({ where: { threadID } });
        return;
    }

    log.info("database.model", "Thread.sqlite3");
    return global.database.model.Thread = {
        getAll,
        find,
        findOne,
        setData,
        setDataAll,
        deleteData
    }
}
