#!/usr/bin/env node

//
// # Command Line Utility
//

const fs = require("fs");
const normalize = require("path").normalize;
const colors = require("colors");
var program = require("commander");

const build = require("../src/build");
const init = require("../src/init");

const info = JSON.parse(fs.readFileSync(normalize(__dirname + "/../package.json")));

var commands = {
    build: build,
    init: init
};

program.
    version(info.version).
    arguments("<cmd>", "initialize the current working directory as an allthedocs project").
    action(function (command) {
        if (commands[command]) {
            try {
                commands[command]();
            }
            catch (error) {
                console.error(colors.red("\n" + error.message + "\n"));
            }
        }
        else if (command === "init") {
            init();
        }
        else {
            console.error(colors.red("\n Unknown command or no command given!\n"));
            process.exit(1);
        }
    }).
    parse(process.argv);
