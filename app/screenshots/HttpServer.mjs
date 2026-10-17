import http from 'http';
import sirv from 'sirv';

export default class HttpServer
{
  constructor({ root = './dist', host } = {}) {
    this.root = root;
    this.host = host;
  }

  /** @member {http.Server} */
  _server = null;

  get port() {
    return this._server.address().port;
  }

  open() {
    return new Promise((resolve, reject) => {
      if (this._server) {
        return resolve();
      }

      const handler = sirv(this.root);
      this._server = http.createServer(handler);
      this._server.on('listening', () => resolve());
      this._server.on('error', reject);
      this._server.listen(0, this.host);
    });
  }

  async close() {
    if (this._server?.listening) {
      await new Promise((resolve, reject) => this._server.close(error => error ? reject(error) : resolve()));
    }
    this._server = null;
  }
}
