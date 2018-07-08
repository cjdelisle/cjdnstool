/*@flow*/
'use strict';
const Cjdnsadmin = require('cjdnsadmin');

module.exports.main = () => {
    Cjdnsadmin.connect((err, c) => {
        if (!c) { return void console.error(err ? err.message : 'unknown error'); }
        const cjdns = c;
        const more = (page) => {
            cjdns.SupernodeHunter_listSnodes(page, (err, ret) => {
                if (err) { throw err; }
                if (ret.error !== 'none') { throw new Error("ERROR: " + ret.error); }
                ret.snodes.forEach((s) => { console.log(s); });
                if (ret.length) {
                    more(page + 1);
                } else {
                    cjdns.disconnect();
                }
            });    
        };
        more(0);
    });
};