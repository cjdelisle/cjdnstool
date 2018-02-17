/*@flow*/
'use strict';
const Cjdnsadmin = require('cjdnsadmin');
const Cjdnsniff = require('cjdnsniff');
const Cjdnskeys = require('cjdnskeys');
const Cjdnsctrl = require('cjdnsctrl');

/*::
import type { Cjdnsniff_CtrlMsg_t } from 'cjdnsniff'
import type { Cjdnsctrl_Ping_t, Cjdnsctrl_ErrMsg_t } from 'cjdnsctrl'
*/

const main = module.exports.main = (argv /*:Array<string>*/) => {
    Cjdnsadmin.connect((err, c) => {
        if (err) {
            console.error(err.message);
            return;
        }
        /*::if (!c) { throw new Error(); }*/
        Cjdnsniff.sniffTraffic(c, 'CTRL', (err, ev) => {
            if (!ev) { throw err; }
            ev.on('error', (e) => { console.error(e); });
            ev.on('message', (msg) => {
                /*::msg = (msg:Cjdnsniff_CtrlMsg_t);*/
                const pr = [];
                pr.push(msg.routeHeader.isIncoming ? '>' : '<');
                pr.push(msg.routeHeader.switchHeader.label);
                pr.push(msg.content.type);
                if (msg.content.type === 'ERROR') {
                    const content = (msg.content/*:Cjdnsctrl_ErrMsg_t*/);
                    pr.push(content.errType);
                    //console.log(content.switchHeader);
                    if (content.switchHeader) {
                        pr.push('label_at_err_node:', content.switchHeader.label);
                    }
                    if (content.nonce) {
                        pr.push('nonce:', content.nonce);
                    }
                    pr.push(content.additional.toString('hex'));
                } else {
                    const content = (msg.content/*:Cjdnsctrl_Ping_t*/);
                    if (content.type in ['PING', 'PONG']) {
                        pr.push('v' + content.version);
                    }
                    if (content.type in ['KEYPING', 'KEYPONG']) {
                        pr.push(content.key);
                    }
                }
                console.log(pr.join(' '));
            });
            console.log("Listening for CTRL traffic on node");
        });
    });
};