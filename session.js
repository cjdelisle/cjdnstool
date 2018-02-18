#!/usr/bin/env node
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
const key2Ip6 = require('./util/key2ip6.js');
const Cjdns = require('cjdnsadmin');
const nThen = require('nthen');

const usage = module.exports.usage = () => {
    console.log("cjdnstool session [COMMAND]");
    console.log("    show (default command)");
    console.log("        -6, --ip6                 # print ipv6 of sessions rather than pubkeys");
};

const printSession = function (session) {
    let state = session.state.replace(/CryptoAuth_/,'');
    while (state.length < ('ESTABLISHED').length) { state = state + ' '; }
    let addr = session.addr;
    if (process.argv.indexOf('--ip6') !== -1) {
        addr = addr.replace(/[a-z0-9]{52}.k/, key2Ip6.convert);
    }
    const out = [ addr, state, session.handle, session.sendHandle, Number(session.metric).toString(16) ];
    if (Number(session.duplicates) !== 0) { out.push(' DUP ', session.duplicates); }
    if (Number(session.lostPackets) !== 0) { out.push(' LOS ', session.lostPackets); }
    if (Number(session.receivedOutOfRange) !== 0) { out.push(' OOR ', session.receivedOutOfRange); }
    console.log(out.join(' '));
};

const main = module.exports.main = (argv) => {
    let cjdns;
    const handles = [];
    const sessions = [];
    nThen(function (waitFor) {
        Cjdns.connect(waitFor((err, c) => {
            if (err) {
                console.error(err.message);
                waitFor.abort();
            }
            /*::if (!c) { throw new Error(); }*/
            cjdns = c;
        }));
    }).nThen(function (waitFor) {
        var more = function (i) {
            cjdns.SessionManager_getHandles(i, waitFor(function (err, ret) {
                if (err) { throw err; }
                handles.push.apply(handles, ret.handles);
                if (ret.more) { more(i+1); }
            }));
        };
        more(0);
    }).nThen(function (waitFor) {
        var next = function (i) {
            cjdns.SessionManager_sessionStats(Number(handles[i]), waitFor(function (err, ret) {
                if (err) { throw err; }
                sessions.push(ret);
                i++;
                if (i < handles.length) { next(i); }
            }));
        };
        if (handles.length) {
            next(0);
        } else {
            console.log("No active sessions");
        }
    }).nThen(function (waitFor) {
        cjdns.disconnect();
        sessions.sort(function (a, b) {
            return (a.addr.substring(a.addr.indexOf('.')) < b.addr.substring(b.addr.indexOf('.')))
                ? -1 : 1;
        });
        for (var i = 0; i < sessions.length; i++) {
            printSession(sessions[i]);
        }
    });
};
if (!module.parent) {
    main(process.argv.slice(2));
}