/*@flow*/
'use strict';
const Minimist = require('minimist');

const Conf = require('../conf.js');

module.exports.main = Conf.confUpdater((argv, cjdns, conf, cb) => {
    if (argv.length < 1) {
        console.error("Must specify username to delete");
        return void cb(100);
    }
    const user = argv[0];
    let deleted = 0;
    for (let i = conf.authorizedPasswords.length; i >= 0; i--) {
        if (!conf.authorizedPasswords[i]) { continue; }
        if (conf.authorizedPasswords[i].user !== user) { continue; }
        conf.authorizedPasswords[i] = undefined;
        deleted++;
    }
    if (!deleted) {
        console.error("Warn: user [" + user + "] does not exist in conf file");
    }
    cjdns.AuthorizedPasswords_remove(user, (err, ret) => {
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