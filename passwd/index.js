/*@flow*/
"use strict";
const Show = require('./show.js');
const Add = require('./add.js');
const Delete = require('./delete.js');

const usage = module.exports.usage = () => {
    console.log("cjdnstool passwd COMMAND");
    console.log("    show (default command)        # show names of configured peering passwords");
    console.log("    add <user> <passwd>           # add the username/password to conf and cjdns");
    console.log("        --ipv6=<addr>             # only allow connections with this cjdns ip6");
    console.log("        -f <file> --file=<file>   # custom location of cjdroute.conf file");
    console.log("    delete <user>                 # remove access to for this user");
    console.log("        -f <file> --file=<file>   # custom location of cjdroute.conf file");
};

const main = module.exports.main = (argv /*:Array<string>*/) => {
    if (argv[0] === 'show') { return Show.main(); }
    if (argv[0] === 'add') { return Add.main(argv.slice(1)); }
    if (argv[0] === 'delete') { return Delete.main(argv.slice(1)); }
    usage();
};