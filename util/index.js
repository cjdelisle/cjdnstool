/*@flow*/
"use strict";
const Key2Ip6 = require('./key2ip6.js');

const usage = module.exports.usage = () => {
    console.log("cjdnstool util COMMAND");
    console.log("    key2ip6 <pubkey>[ <pubkey>][ <pubkey>][...]");
};

const main = module.exports.main = (argv /*:Array<string>*/) => {
    if (argv[0] === 'key2ip6') {
        return Key2Ip6.main(argv.slice(1));
    }
    usage();
};