/*@flow*/
'use strict';
const Pf = require('./pf.js');
const Ctrl = require('./ctrl.js');

const usage = module.exports.usage = () => {
    console.log("cjdnstool mon COMMAND");
    console.log("    pf                            # monitor pathfinder traffic");
    console.log("    ctrl                          # monitor switch control traffic");
};

const main = module.exports.main = (argv /*:Array<string>*/) => {
    if (argv[0] === 'pf') { return Pf.main(argv.slice(1)); }
    if (argv[0] === 'ctrl') { return Ctrl.main(argv.slice(1)); }
    usage();
};