//
// # Frontend JavaScript
//

var T3 = require("t3js");

T3.Application.addService("heading", require("./services/heading"));

T3.Application.addModule("navbar", require("./modules/navbar"));
T3.Application.addModule("files", require("./modules/files"));

T3.Application.init();
