"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const events = require('events');
const crypto = require('crypto');
const requestLib = require('request');
class HttpClient {
    /**
     * Make a http request
     * @param  {string} method
     * @param  {string} url
     * @param  {HttpClientOptions} opts
     * @return {Promise<HttpClientResponse>}
     */
    static call(method, url, opts) {
        return new Promise((resolve, reject) => {
            requestLib(url, HttpClient.merge({}, opts, { method: method.toUpperCase() }), (err, response, body) => {
                if (err)
                    return reject(err);
                resolve({ response: response, body: body });
            });
        });
    }
    /**
     * Merge all object properties
     * @param  {StdObject} target
     * @param  {StdObject[]} ...args
     * @return {StdObject}
     */
    static merge(target, ...args) {
        var sources = [].slice.call(arguments, 1);
        sources.forEach(function (source) {
            for (var prop in source) {
                target[prop] = source[prop];
            }
        });
        return target;
    }
}
class Spidey extends events.EventEmitter {
    constructor(host) {
        super();
        this.host = host;
    }
    /**
     * Get an access token for your app
     * @param {string} key
     * @param {string} secret
     * @returns {Promise<StdObject>}
     */
    getToken(key, secret) {
        return __awaiter(this, void 0, Promise, function* () {
            let date = new Date();
            let cipher = crypto.createCipher(Spidey.algo, secret);
            let text = JSON.stringify({ key: key, time: date.getTime() });
            let crypted = cipher.update(text, 'utf8', 'hex');
            crypted += cipher.final('hex');
            let options = {
                headers: {
                    'key': key,
                    'hash': crypted
                }
            };
            let response = yield HttpClient.call('GET', this.host + '/access', options);
            return JSON.parse(response['body']);
        });
    }
    /**
     * Create DataClient instance
     * @param {string} token
     * @param {number} crawlerId
     * @param {number} parserId
     * @param {string} name
     * @returns {DataClient|null}
     */
    createDataConnection(token, crawlerId, parserId, name) {
        name = (name ? name : (`s${crawlerId}` + (parserId ? `s${parserId}` : '')));
        if (!Spidey.dataClientMap.has(name)) {
            Spidey.dataClientMap.set(name, new DataClient(this.host, token, crawlerId, parserId));
        }
        return Spidey.dataClientMap.get(name) || null;
    }
    /**
     * Get DataClient by name
     * @param  {string} name
     * @return {DateClient}
     */
    getDataClient(name) {
        return Spidey.dataClientMap.get(name) || null;
    }
}
/**
 * Algorithm for the crypto cipher
 * @type {string}
 */
Spidey.algo = 'aes-256-ctr';
/**
 * Data Connection Mapping
 * @type {Map<string, WebCrawler>}
 */
Spidey.dataClientMap = new Map();
exports.Spidey = Spidey;
/**
 * DataClient class
 */
class DataClient extends events.EventEmitter {
    constructor(host, token, crawlerId, parserId) {
        super();
        this.host = host;
        this.token = token;
        this.crawlerId = crawlerId;
        this.parserId = parserId;
        this.url = host + `/crawlers/${crawlerId}/data` + (parserId ? `?parser_id=${parserId}` : '');
    }
    /**
     * Get crawled data infinitely
     * @param {string} token
     * @param {number} crawlerId
     * @param {number} parserId
     * @param {?}url
     */
    fetch(url) {
        return __awaiter(this, void 0, Promise, function* () {
            let options = { headers: { 'token': this.token } };
            if (!url) {
                url = this.url;
            }
            let response = yield HttpClient.call('GET', url, options);
            let body = JSON.parse(response['body']);
            if (body.error) {
                this.emit('error', body);
            }
            yield (() => __awaiter(this, void 0, void 0, function* () { return this.fetchCompleteCallBack(body.results); }))();
            // sleep
            yield new Promise((resolve) => {
                setTimeout(resolve, 2000);
            });
            yield this.fetch(body.meta.next);
        });
    }
    /**
     * Listen on fetch complete event
     * @param  {(StdObject) => void} fn
     * @return {this}
     */
    onFetchComplete(fn) {
        this.fetchCompleteCallBack = fn;
        return this;
    }
    /**
     * Listen on error event
     * @param  {(err) => void} fn
     * @return {this}
     */
    onError(fn) {
        this.on('error', fn);
        return this;
    }
}
exports.DataClient = DataClient;
//# sourceMappingURL=index.js.map