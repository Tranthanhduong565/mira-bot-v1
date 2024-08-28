var { DataBase } = global.mira.config.systemOptions;
var log = require("../lib/log");

async function SQLiteDataBase(firstConnect = true) {
    var sql = require("sequelize");
    var SQL = new sql({
        dialect: "sqlite",
        storage: __dirname + "/database.sqlite",
        pool: {
            max: 20,
            min: 0,
            acquire: 60000,
            idle: 20000
        },
        retry: {
            match: [
                /SQLITE_BUSY/,
            ],
            name: "query",
            max: 20
        },
        logging: false,
        transactionType: "IMMEDIATE",
        define: {
            underscored: false,
            freezeTableName: true,
            charset: "utf8",
            dialectOptions: {
                collate: "utf8_general_ci"
            },
            timestamps: true
        },
        sync: {
            force: false
        }
    });

    try {
        await SQL.authenticate();
        log.info("database.authenticate.type", "SQLite");
        await require("./model/user.sqlite3.js")(SQL, sql);
        await require("./model/thread.sqlite3.js")(SQL, sql);
        return log.wall();
    } catch (error) {
        log.error("database.authenticate.error", "SQLite", error.message);
        console.log(error);
        if (firstConnect) {
            log.warn("database.reAuthenticated", "MongoDB");
            var newConfig = global.mira.config;
            newConfig.systemOptions.DataBase.type = "mongodb";
            global.mira.config = newConfig;
            return MongoDataBase(false);
        } else
            process.exit(1);
    }
}

async function MongoDataBase(firstConnect = true) {
    var { mongoURI } = DataBase;
    var Mongo = require("mongoose");
    var mongoRegex = /^(mongodb:\/\/|mongodb+srv:\/\/)[\w.-]+(:\d{2,5})?(\/[\w.-]*)?(\?.*)?$/;

    try {
        if (!mongoRegex.test(mongoURI))
            throw new Error("mongoURI is invalid.");
        await Mongo.connect(mongoURI);
        log.info("database.authenticate.type", "MongoDB");
        await require("./model/user.mongodb.js")(Mongo);
        await require("./model/thread.mongodb.js")(Mongo);
        return log.wall();
    } catch (error) {
        log.error("database.authenticate.error", "MongoDB", error.message);
        console.log(error);
        if (firstConnect) {
            log.warn("database.reAuthenticated", "SQLite");
            var newConfig = global.mira.config;
            newConfig.systemOptions.DataBase.type = "sqlite";
            global.mira.config = newConfig;
            return SQLiteDataBase(false);
        } else
            process.exit(1);
    }
}

if (DataBase.type !== "sqlite" && DataBase.type !== "mongodb") {
    log.warn("database.notSupport", DataBase.type);
    log.warn("database.defaultType");
    var newConfig = global.mira.config;
    newConfig.systemOptions.DataBase.type = "sqlite";
    global.mira.config = newConfig;
}

module.exports = DataBase.type.toLowerCase() === "sqlite" ? SQLiteDataBase : MongoDataBase;