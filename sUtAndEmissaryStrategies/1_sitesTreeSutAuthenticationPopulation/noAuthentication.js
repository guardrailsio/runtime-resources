import SitesTreeSutAuthenticationPopulation from './strategy.js';

class NoAuthentication extends SitesTreeSutAuthenticationPopulation {
  #fileName = 'noAuthentication';

  constructor({ log, baseUrl, browser, sutPropertiesSubSet }) {
    super({ log, baseUrl, browser, sutPropertiesSubSet });
  }

  async authenticate() {
    const methodName = 'authenticate';

    this.log.info(`The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, { tags: [this.#fileName, methodName] });
  }
}

export default NoAuthentication;
