var crypto = require('crypto');
var url = require('url');
var Q = require('q');
var http = require('http');
var https = require('https');

var undef = require('ifnotundef');

var exports = {};

/**
 *
 * [![GitHub version](https://badge.fury.io/gh/pouc%2Fqlik-request.svg)](https://badge.fury.io/gh/pouc%2Fqlik-request)
 * [![npm version](https://badge.fury.io/js/qlik-request.svg)](https://badge.fury.io/js/qlik-request)
 * [![NPM monthly downloads](https://img.shields.io/npm/dm/qlik-request.svg?style=flat)](https://npmjs.org/package/qlik-request)
 * [![Build Status](https://travis-ci.org/pouc/qlik-request.svg?branch=master)](https://travis-ci.org/pouc/qlik-request)
 * [![Dependency Status](https://gemnasium.com/badges/github.com/pouc/qlik-request.svg)](https://gemnasium.com/github.com/pouc/qlik-request)
 * [![Coverage Status](https://coveralls.io/repos/github/pouc/qlik-request/badge.svg?branch=master)](https://coveralls.io/github/pouc/qlik-request?branch=master)
 *
 * A set of helper functions to query the Qlik Sense REST endpoints
 *
 * @module qlik-request
 * @typicalname qreq
 * @author Lo&iuml;c Formont
 *
 * @license MIT Licensed
 *
 * @example
 * ```javascript
 * var qreq = require("qlik-request");
 * ```
 */
module.exports = exports;

/**
 * Generates a random Xrf key of a given size within a set of given chars
 *
 * @example
 * ```javascript
 * var xrf = qreq.generateXrfkey(8);
 * ```
 *
 * @param {int=} [size=16] the number of characters of the xrf key
 * @param {string=} [chars=abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUWXYZ0123456789] the characters from which to construct the key
 * @returns {string} the xrf key
 */
exports.generateXrfKey = function(size, chars) {
    size = size || 16;
    chars = chars || 'abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUWXYZ0123456789';

    var rnd = crypto.randomBytes(size);
    var value = new Array(size);
    var len = chars.length;

    for (var i = 0; i < size; i++) {
        value[i] = chars[rnd[i] % len];
    }

    return value.join('');
};

/**
 * Makes a request on a Qlik Sense API endpoint defined in the options object, posting the params object
 *
 * @example
 * ```javascript
 * qreq.request({
 *      restUri: 'https://10.76.224.72:4243/qps/ticket',
 *      pfx: pfx,
 *      passPhrase: ''
 * }, {
 *      'UserId': 'qlikservice',
 *      'UserDirectory': '2008R2-0',
 *      'Attributes': []
 * }).then(function(retVal) {
 *      console.log(retVal);
 * });
 * ```
 *
 * @param {options} options the options to connect to the API endpoint
 * @param {Object=} [params] the parameters to post to the API endpoint
 * @returns {Promise} a promise resolving to the response to the request
 */
exports.request = function(options, params) {

    var xrfkey = exports.generateXrfKey();
    var restUri = url.parse(options.restUri);

    var headers = {
        'X-Qlik-Xrfkey': xrfkey,
        'Content-Type': 'application/json'
    };

    if (typeof options.UserDirectory != 'undefined' || typeof options.UserId != 'undefined') {
        headers['X-Qlik-User'] = 'UserDirectory= ' + undef.if(options.UserDirectory, '.') +
            '; UserId= ' + undef.if(options.UserId, 'qlikservice');
    }

    var retry = undef.if(options.retry, 0);

    if (typeof options.session != 'undefined') {
        headers.Cookie = options.session;
    }

    var timeout = undef.if(options.timeout, 10000);

    var settings = {
        protocol: restUri.protocol,
        host: restUri.hostname,
        port: restUri.port,
        path: restUri.pathname + '?' + undef.if(restUri.query, restUri.query + '&', '') + 'xrfkey=' + xrfkey,
        method: undef.if(options.method, 'POST'),
        headers: headers,
        rejectUnauthorized: false,
        agent: false
    };

    if (typeof options.pfx != 'undefined') {
        settings.pfx = options.pfx;
    }
    if (typeof options.passPhrase != 'undefined') {
        settings.passPhrase = options.passPhrase;
    }

    if (typeof options.key != 'undefined') {
        settings.key = options.key;
    }
    if (typeof options.cert != 'undefined') {
        settings.cert = options.cert;
    }
    if (typeof options.ca != 'undefined') {
        settings.ca = options.ca;
    }

    var requestDef = Q.defer();

    if (settings.protocol == 'http:' && typeof options.pfx != 'undefined') {
        requestDef.reject('https is needed to make API call with certificate');
    } else if (settings.protocol != 'https:' && settings.protocol != 'http:') {
        requestDef.reject('http/https is needed to make API call');
    } else if (settings.protocol == 'https:' &&
        !(
            (typeof options.pfx !== 'undefined') ||
            (typeof options.key !== 'undefined' && typeof options.cert !== 'undefined' && typeof options.ca !== 'undefined')
        )
    ) {
        requestDef.reject('https requires a pfx/pem certificate');
    } else {

        var prot = (settings.protocol == 'https:') ? https : http;

        var apireq = prot.request(settings, function(apires) {

            var body = '';
            apires.on('data', function(d) {
                body += d.toString();
            });

            apires.on('end', function(d) {
                if (Math.floor(apires.statusCode / 100) <= 3) {

                    try {
                        requestDef.resolve(JSON.parse(body));
                    } catch (err) {
                        requestDef.resolve({uri: options.restUri, statusCode: apires.statusCode, statusMessage: apires.statusMessage, body: body});
                    }

                } else {
                    try {
                        requestDef.reject(JSON.parse(body));
                    } catch (err) {
                        requestDef.reject({uri: options.restUri, statusCode: apires.statusCode, statusMessage: apires.statusMessage, body: body});
                    }

                }
            });
        });

        // Event for timeout handling
        apireq.on('socket', function(socket) {
            socket.setTimeout(parseInt(timeout));
            socket.on('timeout', function() {
                apireq.abort();
            });
        });

        if (params) {
            apireq.write(JSON.stringify(params));
        }

        apireq.end();

        apireq.on('error', function(e) {
            requestDef.reject(e);
        });

    }

    return requestDef.promise.fail(function(err) {
        if (retry > 0) {
            console.log(settings, err);
            return exports.Base.request(extend(true, {}, options, {retry: retry - 1}), params);
        } else {
            return Q.reject(err);
        }
    });

};
