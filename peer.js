var Cjdns = require('cjdnsadmin');
var Key2Ip6 = require('./util/key2ip6.js');

const usage = module.exports.usage = () => {
    console.log("cjdnstool peer COMMAND");
    console.log("    show (default command)");
    console.log("        -6, --ip6                 # print ipv6 of peers rather than pubkeys");
};

const main = module.exports.main = (argv) => {
    const convert = argv.indexOf('-6') > -1 || argv.indexOf('--ip6') > -1;
    const addr = (a) => {
        if (convert) {
            return a.replace(/[a-z0-9]{52}.k/, Key2Ip6.convert);
        }
        return a;
    };
    Cjdns.connect((err, cjdns) => {
        if (err) {
            console.error(err.message);
            return;
        }
        var again = function (i) {
            cjdns.InterfaceController_peerStats(i, function (err, ret) {
                if (err) { throw err; }
                ret.peers.forEach(function (peer) {
                    let p = addr(peer['addr']) + ' ' + peer['state'] +
                        ' in ' + peer['recvKbps'] + 'kb/s' +
                        ' out ' + peer['sendKbps'] + 'kb/s';

                        if (Number(peer['duplicates']) !== 0) {
                            p += ' ' + ' DUP ' + peer['duplicates'];
                        }
                        if (Number(peer['lostPackets']) !== 0) {
                            p += ' ' + ' LOS ' + peer['lostPackets'];
                        }
                        if (Number(peer['receivedOutOfRange']) !== 0) {
                            p += ' ' + ' OOR ' + peer['receivedOutOfRange'];
                        }
                    if (typeof(peer.user) === 'string') {
                        p += ' "' + peer['user'] + '"';
                    }
                    console.log(p);
                });
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
if (!module.parent) {
    main(process.argv.slice(2));
}