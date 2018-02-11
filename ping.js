const Cjdnskeys = require('cjdnskeys');
const Cjdnstools = require('./index.js');
const nThen = require('nthen');
const Minimist = require('minimist');

var now = function () { return (new Date()).getTime(); };
var nowSeconds = function () { return Math.floor(now() / 1000); };

const usage = module.exports.usage = () => {
    console.log("cjdnstool ping [OPTIONS] <target>");
    console.log("    -k, --keyping                 # send switch ping requesting the key");
    console.log("    -s, --switchping              # send switch ping (requires -k)");
    console.log("    -d <data>, --data=<data>      # send extra data in the ping message");
    console.log("    -c <num>, --count=<num>       # number of pings to send before stopping");
    console.log("    -v, --verbose                 # print debug information");
    console.log("    -i <secs>, --waittime=<secs>  " +
        "# number of seconds between messages (can be fractional)");
};

const dhtPing = (ctx, cb) => {
    console.log('inter-router ping ' + ctx.mut.resolvedName[0]);
    const ping = (num, cb) => {
        const startTime = +new Date();
        ctx.mut.cjdnstools.queryDHT(ctx.mut.resolvedName[0], { q: 'pn' }, (err, ret) => {
            if (err) { throw err; }
            const endTime = +new Date();
            console.log(nowSeconds() + ' ' + ctx.mut.resolvedName[0] + ' seq=' + num +
                ' time=' + (endTime - startTime) + 'ms');
            cb();
        }, { tries: 1 });
    };

    let num = 0;
    const more = () => {
        ping(num, () => {
            num++;
            if (num >= ctx.count) { return void cb(); }
            setTimeout(more, ctx.waittime * 1000);
        });
    };
    more();
};

const ctrlPing = (ctx, cb) => {
    const nn = Cjdnskeys.parseNodeName(ctx.mut.resolvedName[0]);
    const path = nn.path;
    const pingType = ctx.keyPing ? 'KEYPING' : 'PING';
    console.log('ctrl ' + pingType + ' ' + path);
    const ping = (num, cb) => {
        const startTime = +new Date();
        ctx.mut.cjdnstools.queryCTRL(path, pingType, (err, ret) => {
            const endTime = +new Date();
            if (err === 'TIMEOUT') {
                console.log(nowSeconds() + ' ' + path + ' TIMEOUT' +
                    ' seq=' + num + ' time=' + (endTime - startTime) + 'ms');
                return void cb();
            } else if (err) { throw err; }
            const key = ret.key ? ' ' + ret.key : '';
            console.log(nowSeconds() + ' ' + path + key + ' v=' + ret.version +
                ' seq=' + num + ' time=' + (endTime - startTime) + 'ms');
            cb();
        }, { tries: 1 });
    };

    let num = 0;
    const more = () => {
        ping(num, () => {
            num++;
            if (num >= ctx.count) { return void cb(); }
            setTimeout(more, ctx.waittime * 1000);
        });
    };
    more();
};

const main = module.exports.main = (argv) => {
    const args = Minimist(argv, { boolean: [ 'k', 's', 'v' ] });
    const ctx = Object.freeze({
        count: args.c || args.count || Infinity,
        keyPing: args.k || args.keyping,
        switchMode: args.s || args.switchping,
        data: args.d || args.data || '',
        debug: args.v || args.verbose,
        waittime: args.i || args.waittime || 1,
        dest: args._[args._.length - 1],
        mut: {
            cjdnstools: undefined,
            resolvedName: undefined
        }
    });

    if (!ctx.dest) { return void usage(); }
    if (ctx.data && !ctx.switchMode) {
        console.log('Error: -d --data flag not possible without -s (switch ping)\n');
        return void usage();
    }
    if (ctx.keyPing && !ctx.switchMode) {
        console.log('Error: -k --keyping flag not possible without -s (switch ping)\n');
        return void usage();
    }

    let resolvedName;
    nThen((waitFor) => {
        Cjdnstools.create(waitFor((c) => { ctx.mut.cjdnstools = c; }));
    }).nThen((waitFor) => {
        ctx.mut.cjdnstools.resolve(ctx.dest, waitFor((err, ret) => {
            if (err) { throw err; }
            if (ctx.debug) { console.log(ret); }
            ctx.mut.resolvedName = ret[0];
        }), { debug: ctx.debug });
    }).nThen((waitFor) => {
        if (ctx.switchMode) {
            ctrlPing(ctx, waitFor());
        } else {
            dhtPing(ctx, waitFor());
        }
    }).nThen((waitFor) => {
        ctx.mut.cjdnstools.disconnect();
    });
};

if (!module.parent) {
    main(process.argv.slice(2));
}