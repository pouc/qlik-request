var crypto = require('crypto');
var url = require('url');
var promise = require('q');
var http = require('http');
var https = require('https');

var extend = require('extend');

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

    undef.try(options);

    var restUri = url.parse(undef.try(options.restUri, 'options.restUri must be defined'));
    var xrfkey = exports.generateXrfKey();

    var settings = {
        protocol: restUri.protocol,
        hostname: restUri.hostname,
        port: restUri.port,
        path: restUri.pathname + '?' + undef.if(restUri.query, restUri.query + '&', '') + 'xrfkey=' + xrfkey,
        method: undef.if(options.method, 'POST'),
        headers: extend(false, {}, undef.if(options.headers, {})),
        rejectUnauthorized: undef.if(options.rejectUnauthorized, false),
        agent: undef.if(options.agent, false)
    };

    settings.headers['X-Qlik-Xrfkey'] = xrfkey;
    settings.headers['Content-Type'] = 'application/json';

    var timeout = undef.if(options.timeout, 10000);

    if (undef.isnot(options, 'ca')) {
        settings.ca = options.ca;
    }
    if (undef.isnot(options, 'cert')) {
        settings.cert = options.cert;
    }
    if (undef.isnot(options, 'key')) {
        settings.key = options.key;
    }

    var requestDef = promise.defer();

    if (settings.protocol != 'https:' && settings.protocol != 'http:') {
        requestDef.reject('http/https is needed to make API call');
    } else if (
        settings.protocol == 'https:' && (
            undef.is(options, 'ca') ||
            undef.is(options, 'cert') ||
            undef.is(options, 'key')
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
                        if (apires.headers['content-type'].split(';')[0] === 'application/json') {
                            requestDef.resolve(JSON.parse(body));
                        } else {
                            requestDef.resolve(body);
                        }
                    } catch (err) {
                        requestDef.resolve({uri: options.restUri, statusCode: apires.statusCode, statusMessage: apires.statusMessage, body: body});
                    }

                } else {
                    try {
                        if (apires.headers['content-type'].split(';')[0] === 'application/json') {
                            requestDef.reject(JSON.parse(body));
                        } else {
                            requestDef.reject(body);
                        }
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

    return requestDef.promise;

};
