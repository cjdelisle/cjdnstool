/*@flow*/
"use strict";
const Key2Ip6 = require('./key2ip6.js');
const Keygen = require('./keygen.js');
const Priv2pub = require('./priv2pub.js');

const usage = module.exports.usage = () => {
    console.log("cjdnstool util COMMAND");
    console.log("    key2ip6 <pubkey>[ <pubkey>][ <pubkey>][...]");
    console.log("    priv2pub <privkey>[ <privkey>][ <privkey>][...]");
    console.log("    keygen");
};

const main = module.exports.main = (argv /*:Array<string>*/) => {
    if (argv[0] === 'key2ip6') { return Key2Ip6.main(argv.slice(1)); }
    if (argv[0] === 'keygen') { return Keygen.main(argv.slice(1)); }
    if (argv[0] === 'priv2pub') { return Priv2pub.main(argv.slice(1)); }
    usage();
};