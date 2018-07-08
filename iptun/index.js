/*@flow*/
'use strict';
const Show = require('./show.js');

const usage = module.exports.usage = () => {
    console.log("cjdnstool iptun COMMAND");
    console.log("    show (default command)        # show all incoming and outgoing");
    console.log("                                  # iptun connections");
};

const main = module.exports.main = (argv /*:Array<string>*/) => {
    Show.main();
};