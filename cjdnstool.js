#!/usr/bin/env node
'use strict';
const APPS = {
    ping: require('./ping.js'),
    query: require('./query.js'),
    peer: require('./peer.js'),
    session: require('./session.js'),
    util: require('./util/index.js'),
    mon: require('./mon/index.js'),
    resolve: require('./resolve.js'),
    cexec: require('./cexec.js'),
    log: require('./log.js')
};

const usage = () => {
    console.log("Usage: cjdnstool COMMAND OPTIONS");
    Object.keys(APPS).forEach((k) => {
        APPS[k].usage();
        console.log();
    });
};

const main = (argv) => {
    for (let i = 0; i < argv.length; i++) {
        if (APPS[argv[i]]) { return APPS[argv[i]].main(argv.slice(i+1)); }
    }
    usage();
};
main(process.argv);
