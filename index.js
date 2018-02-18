#!/usr/bin/env node
/* -*- Mode:js */
/* vim: set expandtab ts=4 sw=4: */
/*
 * You may redistribute this program and/or modify it under the terms of
 * the GNU General Public License as published by the Free Software Foundation,
 * either version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
'use strict';
const EventEmitter = require('events').EventEmitter;
const Dns = require('dns');
const Crypto = require('crypto');
const Cjdnsniff = require('cjdnsniff');
const nThen = require('nthen');
const Cjdnsadmin = require('cjdnsadmin');
const Cjdnsplice = require('cjdnsplice');
const Cjdnskeys = require('cjdnskeys');
const Cjdnsencode = require('cjdnsencode');
const Cjdnsctrl = require('cjdnsctrl');

const NOFUN = () => {};

const NodesResponse =  {};
NodesResponse.parse = (contentBenc) => {
    if (!contentBenc.n || !contentBenc.np) {
        throw new Error("missing n or np from the response");
    }
    const versions = contentBenc.np;
    if (versions[0] !== 1) { throw new Error("multi-byte version"); }
    const nodes = contentBenc.n;
    const out = [];
    for (let i = 0, j = 1; j < versions.length;) {
        const version = versions[j++];
        const key = nodes.slice(i, i += 32);
        const label = nodes.slice(i, i += 8);
        if (i > nodes.length) { throw new Error(); }
        out.push('v' + version + '.' +
            label.toString('hex').replace(/[0-9a-f]{4}/g, (x) => (x + '.')) +
                Cjdnskeys.keyBytesToString(key));
    }
    return out;
};

const setup = (ctx, type, cb) => {
    if (ctx.links[type]) {
        return void (cb || NOFUN)();
    }
    Cjdnsniff.sniffTraffic(ctx.cjdns, type, (err, cl) => {
        if (err) { throw err; }
        ctx.links[type] = cl;
        cl.on('message', (msg) => { ctx.emitter.emit(type, msg); });
        cl.on('error', (msg) => { ctx.emitter.emit('error', msg); });
        (cb || NOFUN)();
    });
};

const chkType = (type) => {
    type = type.toUpperCase();
    if (['CJDHT', 'CTRL'].indexOf(type) === -1) { throw new Error("no such type " + type); }
    return type;
};

const on = (ctx, type, handler) => {
    type = chkType(type);
    setup(ctx, type);
    ctx.emitter.on(type, handler);
};

const off = (ctx, type, handler) => {
    type = chkType(type);
    setup(ctx, type);
    ctx.emitter.removeListener(type, handler);
};

const sendRaw = (ctx, type, msg) => {
    type = chkType(type);
    setup(ctx, type, () => {
        ctx.links[type].send(msg); 
    });
};

const mkCtrlQuery = (ctx, path, txid, qtype) => {
    return {
        routeHeader: {
            switchHeader: {
                label: path,
                version: 1
            },
            isCtrl: true
        },
        content: {
            type: qtype,
            key: (qtype === 'KEYPING') ? ctx.selfNode.publicKey : undefined,
            version: ctx.selfNode.version,
            content: txid
        }
    };
};

const ipv6ToLongForm = (ipv6) => {
    const out = new Array(8).fill(0);
    const sp = ipv6.split(':');
    for (let i = 0; i < 8; i++) {
        if (!sp[i]) { break; }
        out[i] = Number('0x' + sp[i]);
    }
    let x = sp.length - 1;
    for (let i = 7; i >= 0; i--) {
        if (!sp[x]) { break; }
        out[i] = Number('0x' + sp[x--]);
    }
    return out.map((x) => (('0000' + x.toString(16)).slice(-4))).join(':');
};

const mkTxid = (newPf) => {
    const txid = Crypto.randomBytes(8);
    txid[0] = ((newPf) ? '1' : '0').charCodeAt(0);
    return txid;
};

const LABEL_REGEX = new RegExp('^' + new Array(5).join('.[0-9a-f]{4}').substring(1) + '$');
const queryCTRL = (ctx, dest, qtype, cb, opts) => {
    opts = opts || {};
    const timeout = opts.timeout || 3000;
    const tries = opts.tries || 3;

    if (Array.isArray(dest)) { dest = dest[0]; }
    if (!LABEL_REGEX.test(dest)) {
        const nn = Cjdnskeys.parseNodeName(dest);
        dest = nn.path;
    }

    const txid = Crypto.randomBytes(8);
    const out = mkCtrlQuery(ctx, dest, txid, qtype);

    const ping = ctx.ctrlMessages[txid.toString('base64')] = {
        dest: dest,
        time: +new Date(),
        intr: undefined,
        txid: txid.toString('base64'),
        cb: cb,
        triesRemaining: tries - 1
    };

    ping.intr = setInterval(() => {
        if (ping.triesRemaining-- > 0) { return void sendRaw(ctx, 'CTRL', out); }
        clearInterval(ping.intr);
        delete ctx.ctrlMessages[txid.toString('base64')];
        cb('TIMEOUT');
        return;
    }, timeout);

    sendRaw(ctx, 'CTRL', out);
};

const queryDHT = (ctx, dest, msg, cb, opts) => {
    opts = opts || {};
    const timeout = opts.timeout || 3000;
    const tries = opts.tries || 3;
    const newDht = opts.newDht || false;

    if (Array.isArray(dest)) { dest = dest[0]; }
    const txid = msg.txid = msg.txid || mkTxid(newDht);
    const nn = Cjdnskeys.parseNodeName(dest);
    ctx.applyDHTBoilerPlate(nn.path, msg);

    const out = {
        routeHeader: {
            publicKey: nn.key,
            ip: Cjdnskeys.publicToIp6(nn.key),
            version: nn.v,
            switchHeader: {
                label: nn.path,
                version: 1
            }
        },
        dataHeader: { contentType: 'CJDHT', version: 1 },
        contentBenc: msg
    };

    const ping = ctx.messages[txid.toString('base64')] = {
        dest: dest,
        time: +new Date(),
        intr: undefined,
        txid: txid.toString('base64'),
        cb: cb,
        triesRemaining: tries - 1
    };

    ping.intr = setInterval(() => {
        if (ping.triesRemaining-- > 0) {
            sendRaw(ctx, 'CJDHT', out);
            return;
        }
        clearInterval(ping.intr);
        delete ctx.messages[txid.toString('base64')];
        cb('TIMEOUT');
        return;
    }, timeout);

    sendRaw(ctx, 'CJDHT', out);
};

const mkDebug = (opts) => {
    if (!opts || !opts.debug) { return NOFUN; }
    if (typeof(opts.debug) === 'function') { return opts.debug; }
    return (x) => { console.log(x); };
};

const resolveFromPath = (ctx, dest, cb, opts) => {

};

const resolve = (ctx, dest, cb, opts) => {
    const debug = mkDebug(opts);
    const pref = (opts.preference || 'session,snode,pf').split(',').
        map((x) => (x.toLowerCase())).
        filter((x) => (['session', 'snode', 'pf'].indexOf(x) + 1));
    if (LABEL_REGEX.test(dest)) {
        return void resolveFromPath(ctx, dest, cb, opts);
    }
    try {
        Cjdnskeys.parseNodeName(dest);
        debug('success ' + dest + ' is a node name');
        return void cb(undefined, [[dest, 'ORIG']]);
    } catch (e) { }
    debug('resolving ' + dest + ' to ipv6');
    let ipv6;
    const out = {};
    nThen((waitFor) => {
        Dns.lookup(dest, { family: 6 }, waitFor((e, res) => {
            if (e) { return void cb(e); }
            ipv6 = ipv6ToLongForm(res);
        }));
    }).nThen((waitFor) => {
        if (!ipv6) { return; }
        debug('resolving ' + ipv6 + ' to path (SessionManager)');
        if (pref.indexOf('session') > -1) {
            ctx.cjdns.SessionManager_sessionStatsByIP(ipv6, waitFor((err, res) => {
                out.sess = { err: err, res: res };
            }));
        }
    }).nThen((waitFor) => {
        if (!ipv6) { return; }
        if (out.sess && !opts.all) { return; }
        if (pref.indexOf('snode') > -1) {
            if (ctx.snode) {
                queryDHT(ctx, ctx.snode, {
                    sq: 'gr',
                    src: new Buffer(ctx.selfNode.ipv6.replace(/:/g, ''), 'hex'),
                    tar: new Buffer(ipv6.replace(/:/g, ''), 'hex')
                }, waitFor((err, res) => {
                    out.snode = { err: err, res: res };
                }));
            } else {
                debug('no snode');
            }
        }
    }).nThen((waitFor) => {
        if (!ipv6) { return; }
        if ((out.sess || out.snode) && !opts.all) { return; }
        if (pref.indexOf('pf') > -1) {
            ctx.cjdns.NodeStore_nodeForAddr(ipv6, waitFor((err, res) => {
                out.dht = { err: err, res: res };
            }));
        }
    }).nThen((waitFor) => {
        const answers = [];
        if (out.sess && out.sess.res && out.sess.res.addr) {
            const arr = [ out.sess.res.addr, 'session', out.sess.res.metric.toString(16)];
            answers.push(arr);
        }
        if (out.snode && out.snode.res && out.snode.res.nodes.length) {
            answers.push([ out.snode.res.nodes[0], 'snode']);
        }
        if (out.dht && out.dht.res.result && out.dht.res.result.routeLabel &&
            out.dht.res.result.routeLabel !== 'ffff.ffff.ffff.ffff' &&
            out.dht.res.result.key && out.dht.res.result.protocolVersion > 0)
        {
            const dhtOut = 'v' + out.dht.res.result.protocolVersion + '.' +
                out.dht.res.result.routeLabel + '.' + out.dht.res.result.key;
            answers.push([ dhtOut, 'pf']);
        }
        if (opts.preference) {
            answers.sort((x, y) => {
                if (x[2] === y[2]) { return 0; }
                return pref.indexOf(x[2]) > pref.indexOf(y[2]) ? 1 : -1;
            });
        }
        if (answers.length === 0) {
            cb('NXDOMAIN', answers, out);
        } else {
            cb(undefined, answers, out);
        }
        //cookedOut.answers.forEach((x) => { console.log(JSON.stringify(x)); });
        //console.log(JSON.stringify(cookedOut.answers, null, '  '));
    });
};

const mkNode = (scheme, fullName) => {
    const parsed = Cjdnskeys.parseNodeName(fullName);
    return Object.freeze({
        version: parsed.v,
        publicKey: parsed.key,
        ipv6: Cjdnskeys.publicToIp6(parsed.key),
        scheme: Cjdnsencode.parse(scheme),
        schemeBin: scheme,
    });
};

const mkBoilerPlater = (selfNode) => {
    return (destLabel, msg) => {
        msg.p = msg.p || selfNode.version;
        msg.es = msg.es || selfNode.schemeBin;
        msg.ei = msg.ei || Cjdnsplice.getEncodingForm(destLabel, selfNode.scheme);
    };
};

const checkSnode = (ctx, cb) => {
    cb = cb || NOFUN;
    ctx.cjdns.SupernodeHunter_status((err, res) => {
        ctx.snode = undefined;
        if (err) { return void cb(err); }
        if (res.error !== 'none') { return void cb(res); }
        if (res.activeSnode === 'NONE') { return void cb(res); }
        ctx.snode = res.activeSnode;
        cb(undefined, res.activeSnode);
    });
};

module.exports.create = (cb) => {
    const ctx = {
        links: {},
        emitter: new EventEmitter(),
        cjdns: undefined,
        selfNode: undefined,
        applyDHTBoilerPlate: undefined,
        snode: undefined,
        messages: {},
        ctrlMessages: {}
    };
    nThen((waitFor) => {
        Cjdnsadmin.connect(waitFor((err, c) => {
            if (err) {
                console.error(err.message);
                waitFor.abort();
            }
            ctx.cjdns = c;
        }));
    }).nThen((waitFor) => {
        ctx.cjdns.Core_nodeInfo(waitFor((err, ni) => {
            if (err) { throw err; }
            const selfNode = mkNode(new Buffer(ni.compressedSchemeHex, 'hex'), ni.myAddr);
            ctx.selfNode = selfNode;
            ctx.applyDHTBoilerPlate = mkBoilerPlater(selfNode);
        }));
        const intr = setInterval(() => { checkSnode(ctx, NOFUN); }, 10000);
        ctx.emitter.on('CJDHT', (msg) => {
            const txid = msg.contentBenc.txid;
            const ping = ctx.messages[txid.toString('base64')];
            if (!ping) { return; }
            clearInterval(ping.intr);
            delete ctx.messages[txid.toString('base64')];
            if (msg.contentBenc.n && msg.contentBenc.np) {
                ping.cb(undefined, {
                    nodes: NodesResponse.parse(msg.contentBenc),
                    version: msg.contentBenc.p
                }, msg);
            } else {
                ping.cb(undefined, msg.contentBenc, msg);
            }
        });
        ctx.emitter.on('CTRL', (msg) => {
            if (msg.content.error) { console.log(msg); }
            if (msg.content.type !== 'PONG' && msg.content.type !== 'KEYPONG') { return; }
            const txid = msg.content.content;
            const ping = ctx.ctrlMessages[txid.toString('base64')];
            if (!ping) { return; }
            clearInterval(ping.intr);
            delete ctx.messages[txid.toString('base64')];
            ping.cb(undefined, msg.content, msg);
        });

        checkSnode(ctx, () => {
            cb({
                queryDHT: (dest, msg, cb, opts) => {
                    queryDHT(ctx, dest, msg, cb, opts);
                },
                queryCTRL: (dest, qtype, cb, opts) => {
                    queryCTRL(ctx, dest, qtype, cb, opts);
                },
                resolve: (name, cb, opts) => {
                    resolve(ctx, name, cb, opts);
                },
                disconnect: () => {
                    clearInterval(intr);
                    let nt = nThen;
                    Object.keys(ctx.links).forEach((n) => {
                        nt = nt((waitFor) => {
                            ctx.links[n].disconnect(waitFor());
                        }).nThen;
                    });
                    nt((waitFor) => {
                        ctx.cjdns.disconnect();
                    });
                },
                getSnode: (cb) => {
                    if (ctx.snode) { return void cb(undefined, ctx.snode); }
                    checkSnode(ctx, cb);
                },
                applyDHTBoilerPlate: ctx.applyDHTBoilerPlate,
            });
        });
    });
};