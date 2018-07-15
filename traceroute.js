/*@flow*/
'use strict';
const Minimist = require('minimist');
const Cjdnstools = require('./index.js');
const nThen = require('nthen');
const Cjdnskeys = require('cjdnskeys');
const Cjdnsplice = require('cjdnsplice');

const usage = module.exports.usage = () => {
    console.log("cjdnstool traceroute [OPTIONS] <nodename|ipv6|hostname>");
    console.log("    -2                            # request from the subnode pathfinder");
    console.log("    -v, --verbose                 # print debug information");
    console.log("    -p <pref>, --pref=<pref>      # use specified address resolution preference");
};

const serializeNodeName = (node) => ('v' + node.v + '.' + node.path + '.' + node.key);

const getPeers = (ctx, node, tar, newDht, done) => {
    const startTime = +new Date();
    ctx.mut.cjdnstools.queryDHT(serializeNodeName(node), {
            q: 'gp',
            tar: new Buffer(tar.replace(/\./g, ''), 'hex'),
        },
        (err, ret) => {
            if (err) { throw err; }
            done(ret.nodes, (+new Date() - startTime));
        },
        // We want to use the old dht in general because the new one is buggy in older nodes
        // but the old dht doesn't answer queries coming from "itself" and we're just looking
        // for the first peer so we'll use the new one when talking to ourselves.
        { newDht: newDht || (node.path === '0000.0000.0000.0001') }
    );
};

const avg = (list) => {
    let sum = 0;
    list.forEach((n) => { sum += n; });
    return sum / list.length;
};

const getAllPeers = (ctx, node, target, newDht, done) => {
    const times = [];
    const allNodes = [];
    const getMore = (tar) => {
        getPeers(ctx, node, tar, newDht, (nodes, time) => {
            times.push(time);
            Array.prototype.push.apply(allNodes, nodes);
            let nextHop;
            nodes.forEach((n) => {
                const parsed = Cjdnskeys.parseNodeName(n);
                if (parsed.path === '0000.0000.0000.0001') { return; }
                if (!Cjdnsplice.routesThrough(target, parsed.path)) { return; }
                nextHop = n;
            });
            if (nextHop) {
                done(nextHop, allNodes, Math.floor(avg(times)));
            } else if (nodes.length > 1) {
                //console.log(nodes);
                getMore(Cjdnskeys.parseNodeName(nodes[0]).path);
            } else {
                done(undefined, allNodes, Math.floor(avg(times)));
            }
        });
    };
    getMore('0000.0000.0000.0001');
};

const getPeersTraceroute = (ctx, done) => {
    console.log('traceroute ' + ctx.mut.resolvedName[0] + ' (getPeers) (resolved from [' + ctx.mut.resolvedName[1] + '])');
    const tar = Cjdnskeys.parseNodeName(ctx.mut.resolvedName[0]);
    const next = (addr, targetPath) => {
        process.stdout.write(serializeNodeName(addr));
        getAllPeers(ctx, addr, targetPath, ctx._2, (nextHop, nodes, time) => {
            process.stdout.write(' ' + time + 'ms\n');
            if (!nextHop) {
                if (targetPath !== '0000.0000.0000.0001') {
                    console.log("No next hop was available, probably a non-working path");
                    if (ctx.debug) {
                        console.log('targetPath', targetPath);
                        console.log(nodes);
                    }
                }
                done();
                return;
            }
            //console.log('done', nextHop);
            const nhp = Cjdnskeys.parseNodeName(nextHop);
            targetPath = Cjdnsplice.unsplice(targetPath, nhp.path);
            nhp.path = Cjdnsplice.splice(nhp.path, addr.path);
            next(nhp, targetPath);
        });
    };
    next(Cjdnskeys.parseNodeName(ctx.mut.myAddr), tar.path);
};

const main = module.exports.main = (argv /*:Array<string>*/) => {
    const args = Minimist(argv, { boolean: [ 'v', 'verbose', '2' ] });
    const ctx = Object.freeze({
        debug: args.v || args.verbose,
        pref: args.p || args.pref,
        _2: args['2'],
        dest: args._[args._.length - 1],
        mut: {
            cjdnstools: (undefined /*:any*/),
            resolvedName: ([] /*:Array<string>*/),
            myAddr: ''
        }
    });
    if (!ctx.dest) { return void usage(); }

    nThen((waitFor) => {
        Cjdnstools.create(waitFor((c) => { ctx.mut.cjdnstools = c; }));
    }).nThen((waitFor) => {
        ctx.mut.cjdnstools.cjdns.Core_nodeInfo(waitFor((err, ret) => {
            if (!ret) { waitFor.abort(); return void console.error(err ? err.message : 'unknown error'); }
            if (!ret.myAddr) { waitFor.abort(); return void console.error(ret.error); }
            ctx.mut.myAddr = ret.myAddr;
        }));
    }).nThen((waitFor) => {
        ctx.mut.cjdnstools.resolve(ctx.dest, waitFor((err, ret) => {
            if (err) { throw err; }
            if (ctx.debug) { console.log(ret); }
            ctx.mut.resolvedName = ret[0];
        }), { debug: ctx.debug, preference: ctx.pref });
    }).nThen((waitFor) => {
        // This is just to warm up the code, without it I get reliable 150ms to the local node.
        const parsed = Cjdnskeys.parseNodeName(ctx.mut.myAddr);
        getPeers(ctx, parsed, '0000.0000.0000.0001', false, waitFor());
    }).nThen((waitFor) => {
        getPeersTraceroute(ctx, waitFor());
    }).nThen((waitFor) => {
        ctx.mut.cjdnstools.disconnect();
    });
};