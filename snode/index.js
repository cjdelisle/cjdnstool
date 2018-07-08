/*@flow*/
'use strict';
const Show = require('./show.js');
const Ls = require('./ls.js');

module.exports.usage = () => {
    console.log("cjdnstool snode COMMAND");
    console.log("    show (default command)        # display the currently used supernode, " +
        "if any");
    console.log("    ls                            # list all configured snodes");
};

module.exports.main = (argv /*:Array<string>*/) => {
    if (argv[0] === 'ls') { return Ls.main(); }
    return Show.main();
};