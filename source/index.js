var { spawn } = require("child_process");
var log = require("./lib/log");
var { version } = require("../package.json");

function RunSystem() {
    log.info("system.process.start.message");
    log.info("system.process.start.version", version);
    var Mira = spawn("node", ["mira.js"], {
        cwd: __dirname,
		stdio: "inherit",
		shell: true
    });

    Mira.on("close", exitCode => {
        if (exitCode === 2) {
            log.info("system.process.restart");
			RunSystem();
		} else {
            log.info("system.process.exit", exitCode);
        }
    });
}
RunSystem();