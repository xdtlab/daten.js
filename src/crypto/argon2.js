module.exports = (function () {
    'use strict';

    var Module = require('./argon2-asm.min');

    var ArgonType = {
        Argon2d: 0,
        Argon2i: 1
    };

    function allocateArray(strOrArr) {
        var arr = strOrArr instanceof Uint8Array || strOrArr instanceof Array ? strOrArr
            : Module.intArrayFromString(strOrArr);
        return Module.allocate(arr, 'i8', Module.ALLOC_NORMAL);
    }

    function argon2Hash(params) {
        var tCost = params.time || 1;
        var mCost = params.mem || 1024;
        var parallelism = params.parallelism || 1;
        var pwd = allocateArray(params.pass);
        var pwdlen = params.pass.length;
        var salt = allocateArray(params.salt);
        var saltlen = params.salt.length;
        var hash = Module.allocate(new Array(params.hashLen || 24), 'i8', Module.ALLOC_NORMAL);
        var hashlen = params.hashLen || 24;
        var encoded = Module.allocate(new Array(512), 'i8', Module.ALLOC_NORMAL);
        var encodedlen = 512;
        var argon2Type = params.type || Module.ArgonType.Argon2d;
        var version = 0x13;
        var err;
        try {
            var res = Module._argon2_hash(tCost, mCost, parallelism, pwd, pwdlen, salt, saltlen,
                hash, hashlen, encoded, encodedlen, argon2Type, version);
        } catch (e) {
            err = e;
        }
        var result;
        if (res === 0 && !err) {
            var hashStr = '';
            var hashArr = new Uint8Array(hashlen);
            for (var i = 0; i < hashlen; i++) {
                var byte = Module.HEAP8[hash + i];
                hashArr[i] = byte;
                hashStr += ('0' + (0xFF & byte).toString(16)).slice(-2);
            }
            var encodedStr = Module.Pointer_stringify(encoded);
            result = { hash: hashArr, hashHex: hashStr, encoded: encodedStr };
        } else {
            try {
                if (!err) {
                    err = Module.Pointer_stringify(Module._argon2_error_message(res))
                }
            } catch (e) {
            }
            result = { message: err, code: res };
        }
        try {
            Module._free(pwd);
            Module._free(salt);
            Module._free(hash);
            Module._free(encoded);
        } catch (e) { }
        if (err) {
            throw result;
        } else {
            return result;
        }
    }

    return {
        ArgonType: ArgonType,
        hash: argon2Hash
    };
})();
