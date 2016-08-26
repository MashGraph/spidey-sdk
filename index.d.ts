import * as events from 'events';
/**
 * Standard object interface
 */
export interface StdObject extends Object {
    [key: string]: any;
}
export declare class Spidey extends events.EventEmitter {
    private host;
    /**
     * Algorithm for the crypto cipher
     * @type {string}
     */
    protected static algo: string;
    /**
     * Data Connection Mapping
     * @type {Map<string, WebCrawler>}
     */
    private static dataClientMap;
    constructor(host: string);
    /**
     * Get an access token for your app
     * @param {string} key
     * @param {string} secret
     * @returns {Promise<StdObject>}
     */
    getToken(key: string, secret: string): Promise<StdObject>;
    /**
     * Create DataClient instance
     * @param {string} token
     * @param {number} crawlerId
     * @param {number} parserId
     * @param {string} name
     * @returns {DataClient|null}
     */
    createDataConnection(token: string, crawlerId: number, parserId?: number, name?: string): DataClient;
    /**
     * Get DataClient by name
     * @param  {string} name
     * @return {DateClient}
     */
    getDataClient(name: string): DataClient;
}
/**
 * DataClient class
 */
export declare class DataClient extends events.EventEmitter {
    private host;
    private token;
    private crawlerId;
    private parserId;
    /**
     * Default Url for Data endpoint
     */
    private url;
    /**
     * fetchCompleteCallBack
     * @type {Function}
     */
    private fetchCompleteCallBack;
    constructor(host: string, token: string, crawlerId: number, parserId?: number);
    /**
     * Get crawled data infinitely
     * @param {string} token
     * @param {number} crawlerId
     * @param {number} parserId
     * @param {?}url
     */
    fetch(url?: string): Promise<void>;
    /**
     * Listen on fetch complete event
     * @param  {(StdObject) => void} fn
     * @return {this}
     */
    onFetchComplete(fn: (data: StdObject) => void): this;
    /**
     * Listen on error event
     * @param  {(err) => void} fn
     * @return {this}
     */
    onError(fn: (err) => void): this;
}
