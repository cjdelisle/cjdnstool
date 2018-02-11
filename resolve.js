/*@flow*/
'use strict';
const Cjdnstool = require('./index.js');

const usage = module.exports.usage = () => {
    console.log("cjdnstool resolve OPTIONS <hostname|ipv6>");
    console.log("    --snode                       # resolve with supernode");
    console.log("    --session                     # resolve by looking in session manager");
    console.log("    --pf                          # resolve by querying pathfinder");
    console.log("    --all                         # resolve from snode, session and pathfinder (default)");
    console.log("    -v, --verbose                 # print extra debug information");
};

const main = module.exports.main = (argv /*:Array<string>*/) => {
    let snode = (argv.indexOf('--snode') > -1);
    let session = (argv.indexOf('--session') > -1);
    let pf = (argv.indexOf('--pf') > -1);
    let all = (argv.indexOf('--all') > -1) || (snode && session && pf);
    if (!(snode || session || pf || all)) { all = true; }
    snode = snode || all;
    session = session || all;
    pf = pf || all;
    const verbose = (argv.indexOf('-v') > -1) || (argv.indexOf('--verbose') > -1);

    let target;
    for (let i = 0; i < argv.length; i++) {
        if (!/^-/.test(argv[i])) { target = argv[i]; }
    }

    if (!target) { return void usage(); }

    Cjdnstool.create((cjdnstool) => {
        /*::if (!target) { throw new Error(); }*/
        console.log("Resolving " + target);
        cjdnstool.resolve(target, (err, ret) => {
            if (err) {
                console.error("Error: " + err);
            } else {
                ret.forEach((x) => {
                    if (x[1] === 'SNODE' && snode) {  console.log('snode   ' + x[0]); }
                    if (x[1] === 'SESS' && session) { console.log('session ' + x[0] + ' metric=' + x[2]); }
                    if (x[1] === 'DHT' && pf) {       console.log('pf      ' + x[0]); }
                });
            }
            cjdnstool.disconnect();
        }, { noDHT: !pf, debug: verbose });
    });
};