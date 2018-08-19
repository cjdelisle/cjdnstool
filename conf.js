/*@flow*/
'use strict';
const Fs = require('fs');
const Readline = require('readline');

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

const readConf = (file, cb) => {
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
    readConf(file, (err, ret) => {
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
    readConf(file, (err, ret) => {
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
    readConf(file, (err, ret) => {
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

const main = module.exports.main = (argv /*:Array<string>*/) => {
    let file = '/etc/cjdroute.conf';
    if (argv[0] === '-f') {
        file = argv[1];
        argv.splice(0, 2);
    } else if (argv[0].indexOf('--file=') === 0) {
        file = argv[0].replace(/^--file=/, '');
        argv.shift();
    }
    if (argv[0] === 'migrate') { return migrate(file, argv.slice(1)); }
    if (argv[0] === 'put') { return put(file, argv.slice(1)); }
    if (argv[0] === 'get') { return get(file, argv.slice(1)); }
    usage();
};