/*@flow*/
'use strict';
const Cjdnsadmin = require('cjdnsadmin');
const nThen = require('nthen');

const printConn = (conn) => {
    const out = [
        conn.outgoing ? 'SERVER' : 'CLIENT',
        conn.key
    ];
    if (conn.ip4Address) {
        out.push(conn.ip4Address + '/' + conn.ip4Prefix + ':' + conn.ip4Alloc);
    }
    if (conn.ip6Address) {
        out.push(conn.ip6Address + '/' + conn.ip6Prefix + ':' + conn.ip6Alloc);
    }
    console.log(out.join(' '));
};

module.exports.main = () => {
    let cjdns;
    let connections;
    nThen((w) => {
        Cjdnsadmin.connect(w((err, c) => {
            if (!c) { return void console.error(err ? err.message : 'unknown error'); }
            cjdns = c;
        }));
    }).nThen((w) => {
        cjdns.IpTunnel_listConnections(w((err, ret) => {
            if (err) { throw err; }
            if (ret.error !== 'none') { throw new Error("ERROR: " + ret.error); }
            //console.log(ret);
            connections = ret.connections;
        }));
    }).nThen((w) => {
        let nt = nThen;
        connections.forEach((c) => {
            nt = nt((w) => {
                cjdns.IpTunnel_showConnection(c, w((err, ret) => {
                    if (err) { throw err; }
                    if (ret.error !== 'none') { throw new Error("ERROR: " + ret.error); }
                    printConn(ret);
                    //console.log(ret);
                }));
            }).nThen;
        });
        nt(w());
    }).nThen((w) => {
        cjdns.disconnect();
    });
};