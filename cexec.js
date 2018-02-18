/* @flow */
'use strict';
const Cjdnskeys = require('cjdnskeys');
const Cjdnstools = require('./index.js');
const Cjdnsadmin = require('cjdnsadmin');
const nThen = require('nthen');
const Minimist = require('minimist');

const FUNCTION_DOCS =
    "https://github.com/cjdelisle/cjdns/blob/crashey/doc/admin-api.md#funcs";

const functionDescriptions = (cjdns) => {
    const out = {};
    Object.keys(cjdns._funcs).map((x) => {
        const args = cjdns._funcs[x];
        const argDesc = Object.keys(args).map((x) => {
            const argDef = args[x];
            let out = '--' + x + '=<' + argDef.type + '>';
            if (!argDef.required) { out = '[' + out + ']'; }
            return out;
        });
        argDesc.sort();
        out[x] = 'cjdnstool cexec ' + x + ' ' + argDesc.join(' ');
    });
    return out;
};

const usage = module.exports.usage = () => {
    console.log("cjdnstool cexec [COMMAND ARGS...]");
    console.log("                                  # run `cjdnstool cexec` for all commands");
    console.log("                                  # below are a couple of examples");
    console.log("    Allocator_bytesAllocated      # Determine how many bytes are allocated");
    console.log("    Core_pid                      # Get the cjdns core pid number");
    console.log("    ReachabilityCollector_getPeerInfo");
    console.log("        --page=<Int>              # Get information about your peers (paginated)");
    console.log("    SupernodeHunter_status        # Get a status report from the snode hunter");
    console.log("    see: " + FUNCTION_DOCS);
};

const main = module.exports.main = (argv /*:Array<string>*/) => {
    let cjdns;
    nThen((waitFor) => {
        Cjdnsadmin.connect(waitFor(function (err, c) {
            if (err) {
                console.error(err.message);
                waitFor.abort();
            }
            cjdns = c;
        }));
    }).nThen((waitFor) => {
        const defs = functionDescriptions(cjdns);
        if (!argv.length) {
            console.log("see: " + FUNCTION_DOCS);
            Object.keys(defs).forEach((k) => {
                console.log(defs[k]);
            });
        } else {
            const func = argv[0];
            if (!cjdns[func]) {
                return void console.error(func + " is not an RPC in cjdns");
            }
            const funcDef = cjdns._funcs[func];
            const argNames = Object.keys(funcDef);
            const argVals = new Array(argNames.length).fill(undefined);
            let err;
            if (argv.indexOf('--help') > -1) {
                console.log("Usage: " + defs[func]);
                console.log("see: " + FUNCTION_DOCS);
                return;
            }
            const args = argv.slice(1).map((x) => {
                const res = x.replace(/^--([a-zA-Z0-9]*)\=(.*)$/, (all, key, val) => {
                    if (argNames.indexOf(key) === -1) {
                        err = "Argument " + key + " (" + all + ") is not a valid arg to " +
                            "function call " + func;
                        return '';
                    }
                    if (typeof(val) === 'string' && funcDef[key].type !== 'String') {
                        try { val = JSON.parse(val); } catch (e) { }
                    }
                    argVals[argNames.indexOf(key)] = val;
                    return '';
                });
                if (res) { err = "Unexpected argument " + x; }
            });
            if (err) {
                console.error(err);
                console.error("Usage: " + defs[func]);
                return;
            }

            argVals.push(waitFor((err, ret) => {
                if (err) { return void console.error(err); }
                delete ret.txid;
                console.log(JSON.stringify(ret, null, '  '));
            }));
            cjdns[func].apply(cjdns, argVals);
        }
    }).nThen((waitFor) => {
        cjdns.disconnect();
    });
};

if (!module.parent) {
    main(process.argv.slice(2));
}