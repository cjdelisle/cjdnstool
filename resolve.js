/*@flow*/
'use strict';
const Cjdnstool = require('./index.js');
const Minimist = require('minimist');

const usage = module.exports.usage = () => {
    console.log("cjdnstool resolve OPTIONS <hostname|ipv6>");
    console.log("    -v, --verbose                 # print debug information");
    console.log("    -p <pref>, --pref=<pref>      # use specified address resolution preference");
};

const main = module.exports.main = (argv /*:Array<string>*/) => {
    const args = Minimist(argv, { boolean: [ 'v', 'verbose' ] });
    const ctx = Object.freeze({
        debug: args.v || args.verbose,
        pref: args.p || args.pref
    });
    const target = args._[0];
    if (!target) { return void usage(); }

    Cjdnstool.create((cjdnstool) => {
        /*::if (!target) { throw new Error(); }*/
        console.log("Resolving " + target);
        cjdnstool.resolve(target, (err, ret) => {
            if (err) {
                console.error("Error: " + err);
            } else {
                ret.forEach((x) => {
                    if (x[1] === 'snode') {   console.log('snode   ' + x[0]); }
                    if (x[1] === 'session') { console.log('session ' + x[0] + ' metric=' + x[2]); }
                    if (x[1] === 'pf') {      console.log('pf      ' + x[0]); }
                });
            }
            cjdnstool.disconnect();
        }, { all: true, debug: ctx.debug, preference: ctx.pref });
    });
};