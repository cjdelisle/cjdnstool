/*@flow*/
"use strict";
const Show = require('./show.js');

const usage = module.exports.usage = () => {
    console.log("cjdnstool passwd COMMAND");
    console.log("    show (default command)        # show names of configured peering passwords");
};

const main = module.exports.main = (argv /*:Array<string>*/) => {
    return Show.main();
};