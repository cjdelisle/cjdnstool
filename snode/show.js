/*@flow*/
'use strict';
const Cjdnsadmin = require('cjdnsadmin');

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