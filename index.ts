import * as events from 'events';
import * as crypto from 'crypto';
import * as requestLib from 'request';

class HttpClient {
  /**
   * Make a http request
   * @param  {string} method
   * @param  {string} url
   * @param  {HttpClientOptions} opts
   * @return {Promise<HttpClientResponse>}
   */
  public static call(method: string, url: string, opts?: StdObject): Promise<StdObject> {
    return new Promise((resolve, reject) => {
      requestLib(url, HttpClient.merge({}, opts, { method: method.toUpperCase() }), (err, response, body) => {
        if (err) return reject(err);
        resolve({ response, body});
      });
    });
  }

  /**
   * Merge all object properties
   * @param  {StdObject} target
   * @param  {StdObject[]} ...args
   * @return {StdObject}
   */
  public static merge(target: StdObject, ...args: StdObject[]): StdObject {
    var sources = [].slice.call(arguments, 1);
    sources.forEach(function (source) {
      for (var prop in source) {
        target[prop] = source[prop];
      }
    });
    return target;
  }
}

/**
 * Standard object interface
 */
export interface StdObject extends Object {
  [key: string]: any;
}

export class Spidey extends events.EventEmitter {
  /**
   * Algorithm for the crypto cipher
   * @type {string}
   */
  protected static algo = 'aes-256-ctr';

  /**
   * Data Connection Mapping
   * @type {Map<string, WebCrawler>}
   */
  private static dataClientMap: Map<string, DataClient> = new Map<string, DataClient>();

  constructor(private host: string) {
    super();
  }

  /**
   * Get an access token for your app
   * @param {string} key
   * @param {string} secret
   * @returns {Promise<StdObject>}
   */
  public async getToken(key: string, secret: string): Promise<StdObject> {
    let date = new Date();
    let cipher = crypto.createCipher(Spidey.algo, secret);
    let text = JSON.stringify({ key: key, time: date.getTime()});
    let crypted = cipher.update(text,'utf8','hex');
    crypted += cipher.final('hex');
    let options = {
      headers : {
        'key' : key,
        'hash': crypted
      }
    };

    let response = await HttpClient.call('GET', this.host+'/access', options);

    return JSON.parse(response['body']);
  }

  /**
   * Create DataClient instance
   * @param {string} token
   * @param {number} crawlerId
   * @param {number} parserId
   * @param {string} name
   * @returns {DataClient|null}
   */
  public createDataConnection(token: string, crawlerId: number, parserId?: number, name?: string): DataClient {
    name = (name ? name : (`s${crawlerId}` + (parserId ? `s${parserId}` : '')))   as string;
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
  public getDataClient(name: string): DataClient {
    return Spidey.dataClientMap.get(name) || null;
  }
}

/**
 * DataClient class
 */
export class DataClient extends events.EventEmitter {
  /**
   * Default Url for Data endpoint
   */
  private url: string;
  /**
   * fetchCompleteCallBack
   * @type {Function}
   */
  private fetchCompleteCallBack: (data: StdObject[]) => void;

  constructor(private host: string, private token: string,
              private crawlerId: number, private parserId?:number) {
    super();
    this.url = host + '/crawlers/' + crawlerId + (parserId ? '/parsers/' + parserId : '') + '/data';
  }

  /**
   * Get crawled data infinitely
   * @param {string} token
   * @param {number} crawlerId
   * @param {number} parserId
   * @param {?}url
   */
  public async fetch(url?: string): Promise<void> {
    let options = { headers : { 'token' : this.token} };
    if (!url) {
      url = this.url;
    }

    let response = await HttpClient.call('GET', url, options);
    let body = JSON.parse(response['body']);
    if (body.error) {
      this.emit('error', body);
    }

    await (async () => this.fetchCompleteCallBack(body.results))();

    // sleep
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });

    await this.fetch(body.meta.next);
  }

  /**
   * Listen on fetch complete event
   * @param  {(StdObject) => void} fn
   * @return {this}
   */
  public onFetchComplete(fn: (data: StdObject) => void): this {
    this.fetchCompleteCallBack = fn;
    return this;
  }

  /**
   * Listen on error event
   * @param  {(err) => void} fn
   * @return {this}
   */
  public onError(fn: (err) => void): this {
    this.on('error', fn);
    return this;
  }
}
