var { spawn } = require("child_process");
var { version, name } = require("../package.json");
var log = require("./lib/log");

function RunSystem() {
    log.wall();
    log.info("process.name", name);
    log.info("process.version", version);
    var Mira = spawn("node", ["mira.js"], {
        cwd: __dirname,
        stdio: "inherit",
        shell: true
    });

    Mira.on("close", exitCode => {
        if (exitCode === 2) {
            log.info("process.restarting");
            setTimeout(_ => {
                console.clear();
                RunSystem();
            }, 5000);
        } else {
            log.info("process.exit", exitCode);
        }
    });
}
RunSystem();
