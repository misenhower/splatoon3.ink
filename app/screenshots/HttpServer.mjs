import http from 'http';
import sirv from 'sirv';

export default class HttpServer
{
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

      const handler = sirv('./dist');
      this._server = http.createServer(handler);
      this._server.on('listening', () => resolve());
      this._server.listen();
    });
  }

  async close() {
    if (this._server) {
      await this._server.close();
      this._server = null;
    }
  }
}
