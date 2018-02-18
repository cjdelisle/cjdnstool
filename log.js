/* -*- Mode:Js */
/* vim: set expandtab ts=4 sw=4: */
/*
 * You may redistribute this program and/or modify it under the terms of
 * the GNU General Public License as published by the Free Software Foundation,
 * either version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const Cjdnsadmin = require('cjdnsadmin');
const Minimist = require('minimist');

const usage = module.exports.usage = () => {
    console.log("cjdnstool log [OPTIONS]");
    console.log("    -v <verb>, --verbosity=<verb> # specify the verbosity level of logging");
    console.log("                                  # one of DEBUG, INFO, WARN, ERROR, CRITICAL");
    console.log("                                  # each level implies the levels above it");
    console.log("                                  # INFO will include WARN, ERROR and CRITICAL");
    console.log("    -f <file>, --file=<file>      # limit logging to one file");
    console.log("    -l <line>, --line=<line>      # limit logging to a specific line number");
};

const printMsg = function (data) {
    console.log(data.time + ' ' + data.level + ' ' + data.file + ':' +
        data.line + ' ' + data.message);
};

const main = module.exports.main = (argv) => {
    const args = Minimist(argv);
    Cjdnsadmin.connect((err, cjdns) => {
        const verbosity = args.v || args.verbosity;
        const file = args.f || args.file;
        const line = args.l || args.line;
        cjdns.setDefaultHandler((err, msg) => {
            if (err) { throw err; }
            printMsg(msg);
        });
        cjdns.AdminLog_subscribe(line, verbosity, file, (err, ret) => {
            if (err) { throw err; }
            if (ret.error !== 'none') { throw new Error(ret.error); }

            // make sure cjdns doesn't think we've gone missing!
            setInterval(function () {
                cjdns.ping(function (err, ret) {
                    if (err) { throw err; }
                });
            }, 10000);

            var sigint = false;
            process.on('SIGINT', function () {
                if (sigint) { process.exit(100); }
                console.error('Disconnecting...');
                cjdns.AdminLog_unsubscribe(ret.streamId, function (err, ret) {
                    if (err) { throw err; }
                    console.error('done');
                    cjdns.disconnect();
                    process.exit(0);
                });
            });
        });
    });
};