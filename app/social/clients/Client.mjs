import Status from "../Status.mjs";
import StatusGenerator from "../generators/StatusGenerator.mjs";

export default class Client
{
  key;
  name;

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
