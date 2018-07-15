/*@flow*/
'use strict';
const Cjdnsadmin = require('cjdnsadmin');
const Cjdnsniff = require('cjdnsniff');
const Cjdnskeys = require('cjdnskeys');
const nThen = require('nthen');
const Pf = require('./pf.js');
const Ctrl = require('./ctrl.js');

module.exports.main = () => {
    Cjdnsadmin.connect((err, c) => {
        if (!c) { return void console.error(err ? err.message : 'unknown error'); }
        const cjdns = c;
        cjdns.SupernodeHunter_status((err, ret) => {
            if (err) { throw err; }
            if (ret.error !== 'none') { throw new Error("ERROR: " + ret.error); }
            console.log(ret.activeSnode + ' authorized=' + Boolean(ret.usingAuthorizedSnode));
            cjdns.disconnect();
        });
    });
};

/*::
import type { Cjdnsniff_BencMsg_t, Cjdnsniff_CtrlMsg_t } from 'cjdnsniff'
import type { Cjdnsctrl_ErrMsg_t, Cjdnsctrl_Ping_t } from 'cjdnsctrl'
*/

const main = module.exports.main = () => {
    let cjdns;
    let snode;
    nThen((w) => {
        Cjdnsadmin.connect(w((err, c) => {
            if (!c) { w.abort(); return void console.error(err ? err.message : 'unknown error'); }
            cjdns = c;
        }));
    }).nThen((w) => {
        cjdns.SupernodeHunter_status(w((err, ret) => {
            if (!ret) { w.abort(); return void console.error(err ? err.message : 'unknown error'); }
            if (ret.error !== 'none') { w.abort(); return void console.error(ret.error); }
            snode = ret.activeSnode;
        }));
    }).nThen((w) => {
        if (snode === 'NONE') {
            console.log("No snode currently in use");
            cjdns.disconnect();
            return;
        }
        const parsedSnode = Cjdnskeys.parseNodeName(snode);
        const pfHandler = Pf.mkHandler(false);
        const ctrlHandler = Ctrl.mkHandler();
        Cjdnsniff.sniffTraffic(cjdns, 'CJDHT', (err, ev) => {
            if (!ev) { throw err; }
            ev.on('error', (e) => { console.error(e); });
            ev.on('message', (msg) => {
                // not communication with the snode
                if (msg.routeHeader.publicKey !== parsedSnode.key) { return; }
                // not an snode query nor snode reply
                if (!msg.contentBenc.sq && !msg.contentBenc.recvTime) { return; }
                pfHandler(msg);
            });
        });
        Cjdnsniff.sniffTraffic(cjdns, 'CTRL', (err, ev) => {
            if (!ev) { throw err; }
            ev.on('error', (e) => { console.error(e); });
            ev.on('message', (msg) => {
                if (msg.routeHeader.switchHeader.label !== parsedSnode.path) { return; }
                ctrlHandler(msg);
            });
            //console.log("Listening for CTRL traffic on node");
        });
    });
};