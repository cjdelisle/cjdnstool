/*@flow*/
'use strict';
const Minimist = require('minimist');

const Conf = require('../conf.js');

module.exports.main = Conf.confUpdater((argv, cjdns, conf, cb) => {
    const args = Minimist(argv, { string: [ 'ipv6' ] });
    if (args._.length < 2) {
        console.error("Must specify username and password");
        return void cb(100);
    }
    const obj = {};
    obj.user = args._.shift();
    obj.password = args._.shift();
    if (args.ipv6) { obj.ipv6 = args.ipv6; }
    if (conf.authorizedPasswords.filter((x) => (x && x.user === obj.user)).length) {
        console.error("User called [" + obj.user + "] already exists");
        return void cb(100);
    }
    conf.authorizedPasswords.push(obj);
    cjdns.AuthorizedPasswords_add(obj.password, obj.user, obj.ipv6, (err, ret) => {
        if (err) {
            console.error(err ? err.message : 'unknown error');
            return void cb(100);
        }
        if (ret.error !== 'none') {
            console.error("Error from cjdns engine [" + ret.error + "]");
            return void cb(100);
        }
        cb(0);
    });
});