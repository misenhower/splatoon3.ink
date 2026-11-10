import Status from '../Status.mjs';
import StatusGenerator from '../generators/StatusGenerator.mjs';

export default class Client
{
  key;
  name;

  // True for clients that write files rather than post to an account (ImageWriter, FileWriter).
  internal = false;

  async canSend() {
    return true;
  }

  /**
   * @param {Status} status
   * @param {StatusGenerator} generator
   */
  async send(status, generator) {
    //
  }
}
