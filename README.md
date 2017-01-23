<a name="module_qlik-request"></a>

## qlik-request
[![GitHub version](https://badge.fury.io/gh/pouc%2Fqlik-request.svg)](https://badge.fury.io/gh/pouc%2Fqlik-request)[![npm version](https://badge.fury.io/js/qlik-request.svg)](https://badge.fury.io/js/qlik-request)[![NPM monthly downloads](https://img.shields.io/npm/dm/qlik-request.svg?style=flat)](https://npmjs.org/package/qlik-request)[![Build Status](https://travis-ci.org/pouc/qlik-request.svg?branch=master)](https://travis-ci.org/pouc/qlik-request)[![Dependency Status](https://gemnasium.com/badges/github.com/pouc/qlik-request.svg)](https://gemnasium.com/github.com/pouc/qlik-request)[![Coverage Status](https://coveralls.io/repos/github/pouc/qlik-request/badge.svg?branch=master)](https://coveralls.io/github/pouc/qlik-request?branch=master)A set of helper functions to query the Qlik Sense REST endpoints

**Author:** Lo&iuml;c Formont  
**License**: MIT Licensed  
**Example**  
```javascriptvar qreq = require("qlik-request");```

* [qlik-request](#module_qlik-request)
    * [.generateXrfKey([size], [chars])](#module_qlik-request.generateXrfKey) ⇒ <code>string</code>
    * [.request(options, [params])](#module_qlik-request.request) ⇒ <code>Promise</code>

<a name="module_qlik-request.generateXrfKey"></a>

### qreq.generateXrfKey([size], [chars]) ⇒ <code>string</code>
Generates a random Xrf key of a given size within a set of given chars

**Kind**: static method of <code>[qlik-request](#module_qlik-request)</code>  
**Returns**: <code>string</code> - the xrf key  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [size] | <code>int</code> | <code>16</code> | the number of characters of the xrf key |
| [chars] | <code>string</code> | <code>&quot;abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUWXYZ0123456789&quot;</code> | the characters from which to construct the key |

**Example**  
```javascriptvar xrf = qreq.generateXrfkey(8);```
<a name="module_qlik-request.request"></a>

### qreq.request(options, [params]) ⇒ <code>Promise</code>
Makes a request on a Qlik Sense API endpoint defined in the options object, posting the params object

**Kind**: static method of <code>[qlik-request](#module_qlik-request)</code>  
**Returns**: <code>Promise</code> - a promise resolving to the response to the request  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>options</code> | the options to connect to the API endpoint |
| [params] | <code>Object</code> | the parameters to post to the API endpoint |

**Example**  
```javascriptqreq.request({     restUri: 'https://10.76.224.72:4243/qps/ticket',     pfx: pfx,     passPhrase: ''}, {     'UserId': 'qlikservice',     'UserDirectory': '2008R2-0',     'Attributes': []}).then(function(retVal) {     console.log(retVal);});```
