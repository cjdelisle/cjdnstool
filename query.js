/* @flow */
const Cjdnskeys = require('cjdnskeys');
const Cjdnstools = require('./index.js');
const nThen = require('nthen');

const getPeers = (dest, newPf, debug) => {
    let ct;
    let resolvedName;
    const peers = [];
    nThen((waitFor) => {
        Cjdnstools.create(waitFor((c) => { ct = c; }));
    }).nThen((waitFor) => {
        ct.resolve(dest, waitFor((err, ret) => {
            if (err) { throw err; }
            if (debug) { console.log(ret); }
            resolvedName = ret[0];
        }), { debug: debug });
    }).nThen((waitFor) => {
        console.log("Peers for " + resolvedName[0] + " (resolved from [" + resolvedName[1] + "])");
        const done = waitFor();
        const more = (tar) => {
            if (debug) {
                console.log('Request ' + tar);
            }
            ct.queryDHT(resolvedName, {
                    q: 'gp',
                    tar: new Buffer(tar.replace(/\./g, ''), 'hex'),
                },
                waitFor((err, ret) => {
                    if (err) { throw err; }
                    ret.nodes.reverse();
                    ret.nodes.forEach((n) => {
                        //console.log(n);
                        if (peers.indexOf(n) === -1) { peers.push(n); }
                    });
                    if (ret.nodes.length === 1) { return void done(); }
                    const last = ret.nodes.pop();
                    const parsed = Cjdnskeys.parseNodeName(last);
                    if (parsed.path === '0000.0000.0000.0001') { return void done(); }
                    more(parsed.path);
                }),
                { newDht: newPf }
            );
        };
        more('0000.0000.0000.0001');
    }).nThen((waitFor) => {
        peers.forEach((p) => {
            console.log(p);
        });
        console.log("Total " + peers.length + " peers");
        ct.disconnect();
    });
};

const usage = module.exports.usage = () => {
    console.log("cjdnstool query COMMAND");
    console.log("    getpeers [-2][-v] <nodename|ipv6|hostname>");
    console.log("        -2                        # request from the subnode pathfinder");
    console.log("        -v                        # debug (verbose)");
};

const main = module.exports.main = (argv /*:Array<string>*/) => {
    if (argv[0] !== 'getpeers') { return void usage(); }
    argv.shift();
    let newPf = false;
    let debug = false;
    for (;;) {
        if (argv[0] === '-2') {
            newPf = true;
            argv.shift();
        } else if (argv[0] === '-v') {
            debug = true;
            argv.shift();
        } else {
            break;
        }
    }
    if (argv.length !== 1) {
        return usage();
    }
    getPeers(argv[0], newPf, debug);
};

if (!module.parent) {
    main(process.argv.slice(2));
}