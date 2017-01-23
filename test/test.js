var fs = require('fs');
var chai = require('chai');
var sinon = require('sinon');

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
chai.use(require('chai-things'));

var expect = chai.expect;
var should = chai.should();

var promise = require('q');
var proxy = require('qlik-fake-proxy');

var exp = require('../index.js');

var readFile = promise.denodeify(fs.readFile);

var options = {
    UserId: 'qlik',
    UserDirectory: 'qlik'
};

describe('generateXrfkey...', function() {

	it('should be defined', function() {
		expect(exp.generateXrfKey).to.not.be.undefined;
	});

	it('should work without params', function() {

		var key_0p_1 = exp.generateXrfKey();
		var key_0p_2 = exp.generateXrfKey();
		var key_0p_3 = exp.generateXrfKey();

		expect(key_0p_1).to.be.a('string');
		expect(key_0p_1).to.have.length(16);
		expect(key_0p_1).to.match(/^[a-z0-9A-Z]*$/);

		expect(key_0p_2).to.be.a('string');
		expect(key_0p_2).to.have.length(16);
		expect(key_0p_2).to.match(/^[a-z0-9A-Z]*$/);

		expect(key_0p_3).to.be.a('string');
		expect(key_0p_3).to.have.length(16);
		expect(key_0p_3).to.match(/^[a-z0-9A-Z]*$/);

		expect(key_0p_1).to.not.equal(key_0p_2);
		expect(key_0p_1).to.not.equal(key_0p_3);
		expect(key_0p_2).to.not.equal(key_0p_3);

	});

	it('should work with 1 param', function() {

		var key_1p_1 = exp.generateXrfKey(8);
		var key_1p_2 = exp.generateXrfKey(8);
		var key_1p_3 = exp.generateXrfKey(12);

		expect(key_1p_1).to.be.a('string');
		expect(key_1p_1).to.have.length(8);
		expect(key_1p_1).to.match(/^[a-z0-9A-Z]*$/);

		expect(key_1p_2).to.be.a('string');
		expect(key_1p_2).to.have.length(8);
		expect(key_1p_2).to.match(/^[a-z0-9A-Z]*$/);

		expect(key_1p_3).to.be.a('string');
		expect(key_1p_3).to.have.length(12);
		expect(key_1p_3).to.match(/^[a-z0-9A-Z]*$/);

		expect(key_1p_1).to.not.equal(key_1p_2);

	});

	it('should work with 2 params', function() {

		var key_2p_1 = exp.generateXrfKey(8, 'abcdef');
		var key_2p_2 = exp.generateXrfKey(8, 'abcdef');
		var key_2p_3 = exp.generateXrfKey(12, 'abcdefGHIJKL');

		expect(key_2p_1).to.be.a('string');
		expect(key_2p_1).to.have.length(8);
		expect(key_2p_1).to.match(/^[a-f]*$/);

		expect(key_2p_2).to.be.a('string');
		expect(key_2p_2).to.have.length(8);
		expect(key_2p_2).to.match(/^[a-f]*$/);

		expect(key_2p_3).to.be.a('string');
		expect(key_2p_3).to.have.length(12);
		expect(key_2p_3).to.match(/^[a-fG-L]*$/);

		expect(key_2p_1).to.not.equal(key_2p_2);

	});

});

describe('request...', function() {

	it('should be defined', function() {
		expect(exp.request).to.not.be.undefined;
	});

	it('should reject fake endpoints', function(done) {
		promise.all([
			exp.request({restUri: 'ftp://localhost/qmc'}).should.be.rejectedWith('http/https is needed to make API call'),
			exp.request({restUri: 'https://192.168.123.123/qmc', timeout: 1000}).should.be.rejected
		]).should.notify(done);
	});

	it('should accept real endpoints', function(done) {
		this.timeout(15000);
		var server;

		proxy.createProxy({ port: 1337 }).then((srv) => {
			server = srv;
			return exp.request({
				restUri: `http://localhost:${srv.address().port}/status/servicestate`,
				method: 'GET',
				UserId: options.UserId,
				UserDirectory: options.UserDirectory
			}).should.eventually.have.property('value').to.be.within(1, 3);
			
		}).then(function() {
			done();
		}, function(err) {
			done(err);
		}).finally(() => {
			server.close();
		});
		
	});

	var key = readFile('./node_modules/qlik-fake-proxy/certs/client_key.pem');
	var cert = readFile('./node_modules/qlik-fake-proxy/certs/client.pem');
	var ca = readFile('./node_modules/qlik-fake-proxy/certs/root.pem');

	it('should find certificate pem files', function(done) {
		expect(promise.all([
			key,
			cert,
			ca
		])).to.be.fulfilled.notify(done);
	});

	it('should accept real endpoints using pems', function(done) {
		this.timeout(15000);
		var server;

		promise.all([
			key,
			cert,
			ca
		]).then(function(reply) {
			
			return proxy.createProxy({ port: 1338, secure: true }).then((srv) => {
				server = srv;
				return exp.request({
					restUri: `https://localhost:${srv.address().port}/qrs/proxyservice/local`,
					method: 'GET',
					UserId: options.UserId,
					UserDirectory: options.UserDirectory,
					key: reply[0],
					cert: reply[1],
					ca: reply[2]
				}).should.eventually.have.property('id').to.match(/^[a-f\-0-9]*$/);
				
			});

		}).then(function() {
			done();
		}, function(err) {
			done(err);
		}).finally(() => {
			server.close();
		});

	});

});