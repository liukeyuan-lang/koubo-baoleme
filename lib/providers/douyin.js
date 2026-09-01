"use strict";
const { callProvider } = require("./common");
module.exports = { parse: (url) => callProvider("douyin", url) };
