/*@flow*/
'use strict';
const Cjdnsadmin = require('cjdnsadmin');

module.exports.main = () => {
    Cjdnsadmin.connect((err, c) => {
        if (!c) { return void console.error(err ? err.message : 'unknown error'); }
        const cjdns = c;
        const more = (page) => {
            cjdns.AuthorizedPasswords_list(page, (err, ret) => {
                if (err) { throw err; }
                ret.users.forEach((u) => { console.log(u); });
                if (ret.users.length) {
                    more(page + 1);
                } else {
                    cjdns.disconnect();
                }
            });
        };
        more(0);
    });
};