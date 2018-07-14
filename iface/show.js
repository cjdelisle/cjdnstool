/*@flow*/
'use strict';
const Cjdnsadmin = require('cjdnsadmin');
const nThen = require('nthen');

const printIface = (iface) => {
    console.log(iface.ifNum + ' \t' + iface.name + '\tbeaconState=' + iface.beaconState);
};

module.exports.main = () => {
    Cjdnsadmin.connect((err, c) => {
        if (!c) { return void console.error(err ? err.message : 'unknown error'); }
        const cjdns = c;
        var again = function (i) {
            cjdns.InterfaceController_interfaces(i, function (err, ret) {
                if (err) { throw err; }
                ret.ifaces.forEach(printIface);
                if (typeof(ret.more) !== 'undefined') {
                    again(i+1);
                } else {
                    cjdns.disconnect();
                }
            });
        };
        again(0);
    });
};