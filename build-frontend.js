
const path = require("path");
const fs = require("fs");
const browserify = require("browserify");

const jsIndexFilePath = "./src/frontend/index.js";
const bundlePath = path.join(__dirname, "frontend.js");
    
browserify().
    require(require.resolve(jsIndexFilePath), {
        entry: true,
        debug: true
    }).
    bundle().
    on("error", console.error.bind(console)).
    pipe(fs.createWriteStream(bundlePath));
