/*@flow*/
'use strict';
const Fs = require('fs');
const Readline = require('readline');

const nThen = require('nthen');
const Cjdnsadmin = require('cjdnsadmin');
const Cjdnsconf = require('cjdnsconf');
const JsDiff = require('diff');

const usage = module.exports.usage = () => {
    console.log("cjdnstool conf [-f <f>] [--file=<f>] COMMAND");
    console.log("    -f <f>, --file=<f>            # use file <f>, default: /etc/cjdroute.conf");
    console.log("    migrate [-y]                  # convert v1 config format to v2");
    console.log("        -y                        # answer yes to all questions");
    console.log("        -d, --dryrun              # dry-run, print a unified diff of what ");
    console.log("                                  # WOULD be changed");
    console.log("    put [OPTIONS] <path> <val>    # add/update an entry in a v2 config");
    console.log("        -d, --dryrun              # dry-run, print a unified diff of what ");
    console.log("                                  # WOULD be changed");
    console.log("    get <path>                    # retreive an entry in a v1 or v2 config");
};

const readFile = (file, cb) => {
    Fs.readFile(file, 'utf8', (err, ret) => {
        if (err && err.code === 'ENOENT') {
            console.error('Could not find cjdns conf file at path [' + file + ']');
            return void cb(err);
        } else if (!ret) {
            throw err;
        }
        cb(null, ret);
    });
};

const isDryRun = (argv) => {
    let dryRun = false;
    ['-d', '--dryrun'].forEach((f) => {
        if (argv.indexOf(f) === -1) { return; }
        argv.splice(argv.indexOf(f), 1);
        dryRun = true;
    });
    return dryRun;
};

const migrate = (file, argv) => {
    const dryRun = isDryRun(argv);
    const yes = (argv.indexOf('-y') > -1);
    if (yes) { argv.splice(argv.indexOf('-y'), 1); }
    readFile(file, (err, ret) => {
        if (!ret) { return; }
        const conf = Cjdnsconf.parse(ret, true);
        if (!conf.version || conf.version < 2) { conf.version = 2; }
        const result = Cjdnsconf.stringify(conf) + '\n';
        const patch = JsDiff.createPatch(file, ret, result);
        if (dryRun) {
            console.log(patch);
            return;
        }
        const writeIt = () => {
            Fs.writeFile(file + '.cjdnstool-new', result, (err) => {
                if (err) { throw err; }
                Fs.rename(file, file + '.old', (err) => {
                    if (err) {
                        Fs.unlink(file + '.cjdnstool-new', (err) => {});
                        throw err;
                    }
                    Fs.rename(file + '.cjdnstool-new', file, (err) => {
                        if (err) { throw err; }
                        console.log(file + " written");
                    });
                });
            });

        };
        if (yes) {
            if (result === ret) { return; }
            return void writeIt();
        }
        if (result === ret) {
            return void console.log("Nothing to change, the file is perfect");
        }
        console.log(patch);
        const rl = Readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        const question = () => {
            console.log('\nMaking these changes in file [' + file + ']');
            console.log('Old version will be stored in [' + file + '.old]');
            rl.question('Is this ok? [Y/n] ', (answer) => {
                if (!answer || ['yes', 'y'].indexOf(answer.toLowerCase()) > -1) {
                    writeIt();
                    rl.close();
                    return;
                }
                if (['no', 'n'].indexOf(answer) > -1) {
                    console.log("aborting");
                    rl.close();
                }
                console.log("I didn't understand your answer");
                question();
            });
        };
        question();
    });
};

const putUsage = () => {
    console.error("Usage: cjdnstool conf [-f <file>][--file=<file>] put [-d][--dryrun] <path> <val>");
    console.error("e.g.   cjdnstool conf put security[0].user nobody");
};
const put = (file, argv) => {
    const dryRun = isDryRun(argv);
    if (argv.length !== 2) {
        console.error("Incorrect number of arguments");
        return void putUsage();
    }
    const path = argv[0];
    if (!/^[a-zA-Z0-9_\[\]\.]+$/.test(path)) {
        console.error("Path [" + path + "] contains illegal characters other than: a-zA-Z0-9_[].");
        return void putUsage();
    }
    readFile(file, (err, ret) => {
        if (!ret) { return; }
        const conf = Cjdnsconf.parse(ret, false);
        if (!conf.version || conf.version < 2) {
            console.error("Not modifying config file because it seems to be using the old format");
            console.error("Please use `cjdnstool conf migrate` to migrate it to v2 first");
            return;
        }
        let val;
        try {
            val = JSON.parse(argv[1]);
        } catch (e) {
            val = argv[1];
        }
        // eval is evil, except when it isn't...
        // jshint -W054
        const f = new Function('conf', 'val', 'conf.' + path + ' = val;');
        // $FlowFixMe this is not wrong but flow doesn't understand new Function()
        f(conf, val);
        const result = Cjdnsconf.stringify(conf) + '\n';
        if (dryRun) {
            const patch = JsDiff.createPatch(file, ret, result);
            console.log(patch);
        } else {
            Fs.writeFile(file, result, (err) => {
                if (err) { throw err; }
            });
        }
    });
};

const getUsage = () => {
    console.error("Usage: cjdnstool conf [-f <file>][--file=<file>] get <path>");
    console.error("e.g.   cjdnstool conf get security[0].keepNetAdmin");
};
const get = (file, argv) => {
    if (argv.length !== 1) {
        console.error("Incorrect number of arguments");
        return void getUsage();
    }
    const path = argv[0];
    if (!/^[a-zA-Z0-9_\[\]\.]+$/.test(path)) {
        console.error("Path [" + path + "] contains characters other than <alphanumeric> _ [ ] .");
        return void getUsage();
    }
    readFile(file, (err, ret) => {
        if (!ret) { return; }
        const conf = Cjdnsconf.parse(ret, true);
        // eval is evil, except when it isn't...
        // jshint -W054
        const f = new Function('conf', 'return conf.' + path);
        // $FlowFixMe this is not wrong but flow doesn't understand new Function()
        const result = f(conf);
        if (typeof(result) === 'object') {
            console.log(JSON.stringify(result));
        } else {
            console.log(result);
        }
    });
};

const readConf = module.exports.readConf = (
    file /*:?string*/,
    cb /*:(?Error,?any)=>void*/
) => {
    file = file || "/etc/cjdroute.conf";
    readFile(file, (err, ret) => {
        if (!ret) { return void cb(err); }
        let conf;
        try {
            conf = Cjdnsconf.parse(ret, false);
        } catch (e) {
            return void cb(e);
        }
        cb(undefined, conf);
    });
};

const writeConf = module.exports.writeConf = (
    file /*:?string*/,
    conf /*:any*/,
    cb /*:(?Error)=>void*/
) => {
    file = file || "/etc/cjdroute.conf";
    try {
        const result = Cjdnsconf.stringify(conf) + '\n';
        Fs.writeFile(file, result, (err) => { cb(err); });
    } catch (e) {
        return void cb(e);
    }
};

const getFileName = module.exports.getFileName = (
    argvX /*:Array<string>*/
) /*:[string, Array<string>]*/ => {
    const argv = argvX.slice(0);
    const idx = argv.indexOf('-f');
    if (idx > -1) {
        return [ argv[idx + 1], argv.splice(idx, 2) ];
    } else {
        for (let i = 0; i < argv.length; i++) {
            if (argv[i].startsWith('--file=')) {
                return [ argv[i].replace(/^--file=/, ''), argv.splice(i, 1) ];
            }
        }
    }
    return [ '/etc/cjdroute.conf', argv ];
};

const canWrite = module.exports.canWrite = (
    file /*:string*/,
    cb /*:(?Error)=>void*/
) => {
    Fs.access(file, Fs.constants.W_OK, cb);
};

module.exports.confUpdater = (
    update /*:(argv:Array<string>, cjdns:any, conf:any, cb:(number)=>void)=>void*/
) => {
    return (argvX /*:Array<string>*/) => {
        const [ file, argv ] = getFileName(argvX);
        let cjdns;
        let conf;
        let retCode = 0;
        nThen((w) => {
            Fs.access(file, Fs.constants.R_OK, (err) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        console.error("Cannot find conf file [" + file +
                            "] specify --file=<file> if it is in a different location");
                    } else {
                        console.error("Cannot access conf file [" + file +
                            "] errno = [" + String(err.code) + "]");
                    }
                    process.exit(100);
                }
            });
        }).nThen((w) => {
            readConf(file, w((err, c) => {
                if (err) {
                    console.error("Error reading conf file [" + file +
                        "] [" + err + "]");
                    process.exit(100);
                }
                conf = c;
            }));
        }).nThen((w) => {
            Fs.access(file, Fs.constants.W_OK, (err) => {
                if (err) {
                    console.error("Cannot write to [" + file +
                        "] be sure you have the proper permissions");
                    process.exit(100);
                }
            });
        }).nThen((w) => {
            Cjdnsadmin.connect(w((err, c) => {
                if (!c) {
                    console.error(err ? err.message : 'unknown error');
                    process.exit(100);
                }
                cjdns = c;
            }));
        }).nThen((w) => {
            update(argv, cjdns, conf, w((rc) => {
                retCode = rc || 0;
            }));
        }).nThen((w) => {
            cjdns.disconnect();
            if (retCode) { return; }
            writeConf(file, conf, w((err) => {
                if (!err) { return; }
                console.error("Failed to write config file, cjdroute is updated but " +
                    "config file is not. Cause: [" + err + "]");
                process.exit(100);
            }));
        }).nThen((w) => {
            process.exit(retCode);
        });
    };
};

const main = module.exports.main = (argvX /*:Array<string>*/) => {
    const [ file, argv ] = getFileName(argvX);
    if (argv[0] === 'migrate') { return migrate(file, argv.slice(1)); }
    if (argv[0] === 'put') { return put(file, argv.slice(1)); }
    if (argv[0] === 'get') { return get(file, argv.slice(1)); }
    usage();
};