/*@flow*/
'use strict';
const Cjdnsadmin = require('cjdnsadmin');
const Cjdnsniff = require('cjdnsniff');
const Cjdnskeys = require('cjdnskeys');
const Cjdnsaddr = require('cjdnsaddr');
const Cjdnsann = require('cjdnsann');

/*::
import type { Cjdnsniff_BencMsg_t } from 'cjdnsniff'
*/

const mkHandler = module.exports.mkHandler = (
    showPeer /*:?boolean*/
) => {
    if (showPeer !== false) { showPeer = true; }
    return (
        msg /*:Cjdnsniff_BencMsg_t*/,
        out /*:?(string)=>void*/
    ) => {
        const pr = [];
        pr.push(msg.routeHeader.isIncoming ? '>' : '<');
        if (showPeer) {
            pr.push('v' + msg.routeHeader.version);
            pr.push(msg.routeHeader.switchHeader.label);
            pr.push(msg.routeHeader.ip);
        }
        //console.log(msg.routeHeader);
        const qb = msg.contentBenc.q;
        const sq = msg.contentBenc.sq;
        if (sq) {
            const q = sq.toString('utf8');
            if (q === 'gr') {
                pr.push('getRoute');
                pr.push(Cjdnskeys.ip6BytesToString(msg.contentBenc.src));
                pr.push(Cjdnskeys.ip6BytesToString(msg.contentBenc.tar));
            } else if (q === 'ann') {
                const ann = Cjdnsann.parse(msg.contentBenc.ann);
                const ann2 = {};
                Object.keys(ann).forEach((k) => { ann2[k] = ann[k]; });
                delete ann2.binary;
                pr.push('ann', JSON.stringify(ann2, null, '    '));
            } else {
                pr.push(q);
            }
        } else if (qb) {
            const q = qb.toString('utf8');
            if (q === 'fn') {
                pr.push('findNode');
                pr.push(Cjdnskeys.ip6BytesToString(msg.contentBenc.tar));
            } else if (q === 'gp') {
                pr.push('getPeers');
                pr.push(msg.contentBenc.tar.toString('hex').replace(
                    /[0-9a-f]{4}/g, (x) => (x + '.')).slice(0, -1));
            } else {
                pr.push(q);
            }
        } else {
            pr.push('reply');
            if (msg.contentBenc.n && msg.contentBenc.np) {
                pr.push(JSON.stringify(Cjdnsaddr.parseReply(msg.contentBenc), null, '    '));
            } else if (msg.contentBenc.stateHash) {
                pr.push('stateHash', msg.contentBenc.stateHash.toString('hex'));
            } else {
                let empty = true;
                Object.keys(msg.contentBenc).forEach((k) => {
                    if (['ei','es','p','recvTime','txid'].indexOf(k) !== -1) { return; }
                    if (k === 'error') {
                        const error = msg.contentBenc.error.toString('utf8');
                        if (error === 'none') { return; }
                        pr.push('error', error);
                        return;
                    }
                    empty = false;
                });
                if (empty) {
                    pr.push('[]');
                } else {
                    pr.push(JSON.stringify(msg.contentBenc));
                }
            }
        }
        console.log(pr.join(' '));
        (out || console.log)(pr.join(' '));
    };
};

const main = module.exports.main = (argv /*:Array<string>*/) => {
    const handler = mkHandler(true);
    Cjdnsadmin.connect((err, c) => {
        if (err) {
            console.error(err.message);
            return;
        }
        /*::if (!c) { throw new Error(); }*/
        Cjdnsniff.sniffTraffic(c, 'CJDHT', (err, ev) => {
            if (!ev) { throw err; }
            ev.on('error', (e) => { console.error(e); });
            ev.on('message', handler);
        });
    });
};