/*@flow*/
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
const Crypto = require('crypto');
const Nacl = require('tweetnacl');

// see: util/Base32.h
const Base32_encode = (input) => {
    const out = [];
    let inIndex = 0;
    let work = 0;
    let bits = 0;
    const kChars = "0123456789bcdfghjklmnpqrstuvwxyz";

    while (inIndex < input.length) {
        work |= (input[inIndex++]) << bits;
        bits += 8;

        while (bits >= 5) {
            out.push(kChars[work & 31]);
            bits -= 5;
            work >>= 5;
        }
    }

    if (bits) {
        out.push(kChars[work & 31]);
        bits -= 5;
        work >>= 5;
    }

    return out.join('');
};

const base32 = module.exports.base32 = (pub) => {
    if (pub.length !== 32) { throw new Error("length must be 32, was [" + pub.length + "]"); }
    return Base32_encode(pub) + '.k';
};

const main = module.exports.main = (argv /*:Array<string>*/) => {
    argv.forEach((a) => {
        if (!/[a-f0-9]{64}/.test(a)) {
            throw new Error("input [" + a + "] doesn't look like a valid key");
        }
        const key = new Buffer(a, 'hex');
        const kp = Nacl.box.keyPair.fromSecretKey(key);
        console.log(base32(kp.publicKey));
    });
};