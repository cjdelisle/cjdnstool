/*@flow*/
'use strict';
const Crypto = require('crypto');
const Nacl = require('tweetnacl');
const Priv2pub = require('./priv2pub.js');

const main = module.exports.main = (argv /*:Array<string>*/) => {
    for (;;) {
        const kp = Nacl.box.keyPair();
        const h1 = Crypto.createHash('sha512').update(kp.publicKey).digest();
        const out = Crypto.createHash('sha512').update(h1).digest('hex');
        if (!out.startsWith('fc')) { continue; }
        console.log(
            new Buffer(kp.secretKey).toString('hex') + ' ' +
            Priv2pub.base32(kp.publicKey) + ' ' +
            out.replace(/.{4}/g, (x) => (x + ':')).slice(0, 39)
        );
        break;
    }
};