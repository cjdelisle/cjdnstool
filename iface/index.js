/*@flow*/
'use strict';
const Show = require('./show.js');

const usage = module.exports.usage = () => {
    console.log("cjdnstool iface COMMAND");
    console.log("    show (default command)        # show all configured interfaces");
};

const main = module.exports.main = (argv /*:Array<string>*/) => {
    Show.main();
};