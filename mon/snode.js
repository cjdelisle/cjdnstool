/*@flow*/
'use strict';
const Cjdnsadmin = require('cjdnsadmin');
const Cjdnsniff = require('cjdnsniff');
const Cjdnskeys = require('cjdnskeys');
const nThen = require('nthen');
const Pf = require('./pf.js');
const Ctrl = require('./ctrl.js');

/*::
import type { Cjdnsniff_BencMsg_t, Cjdnsniff_CtrlMsg_t } from 'cjdnsniff'
import type { Cjdnsctrl_ErrMsg_t, Cjdnsctrl_Ping_t } from 'cjdnsctrl'
*/

const main = module.exports.main = (argv /*:Array<string>*/) => {
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
        const raw = (argv.indexOf('--raw') > -1);
        const parsedSnode = Cjdnskeys.parseNodeName(snode);
        const pfHandler = Pf.mkHandler(false, raw);
        const ctrlHandler = Ctrl.mkHandler(raw);
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