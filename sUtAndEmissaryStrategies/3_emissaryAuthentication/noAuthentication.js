import EmissaryAuthentication from './strategy.js';

// Doc: https://www.zaproxy.org/docs/authentication/
// Doc: https://www.zaproxy.org/docs/desktop/start/features/authentication/
// Doc: https://www.zaproxy.org/docs/desktop/start/features/authmethods/
// Doc: https://www.zaproxy.org/docs/api/#getting-authenticated
// Doc: https://docs.google.com/document/d/1LSg8CMb4LI5yP-8jYDTVJw1ZIJD2W_WDWXLtJNk3rsQ/edit#

class NoAuthentication extends EmissaryAuthentication {
  #sutPropertiesSubSet;
  #setUserId;
  #emissaryPropertiesSubSet;
  #fileName = 'noAuthentication';

  constructor({ log, baseUrl, sutPropertiesSubSet, setUserId, emissaryPropertiesSubSet, zAp }) {
    super({ log, baseUrl, zAp });
    this.#sutPropertiesSubSet = sutPropertiesSubSet;
    this.#setUserId = setUserId;
    this.#emissaryPropertiesSubSet = emissaryPropertiesSubSet;
  }

  async configure() {
    const methodName = 'configure';
    const {
      testSession: { attributes: { excludedRoutes }, relationships: { data: testSessionResourceIdentifiers } },
      context: { id: contextId, name: contextName }
    } = this.#sutPropertiesSubSet;

    const { maxDepth, threadCount } = this.#emissaryPropertiesSubSet;
    let userId;

    this.log.info(`The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, { tags: [this.#fileName, methodName] });

    await this.zAp.aPi.spider.setOptionMaxDepth({ Integer: maxDepth })
      .then((resp) => {
        this.log.info(`Set the spider max depth to: "${maxDepth}". Response was: ${JSON.stringify(resp)}.`, { tags: [this.#fileName, methodName] });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to set the spider max depth. Error was: ${err.message}.`;
        this.log.error(errorText, { tags: [this.#fileName, methodName] });
        throw new Error(errorText);
      });
    await this.zAp.aPi.spider.setOptionThreadCount({ Integer: threadCount })
      .then((resp) => {
        this.log.info(`Set the spider thread count to: "${threadCount}". Response was: ${JSON.stringify(resp)}.`, { tags: [this.#fileName, methodName] });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to set the spider thread count. Error was: ${err.message}.`;
        this.log.error(errorText, { tags: [this.#fileName, methodName] });
        throw new Error(errorText);
      });

    const routes = testSessionResourceIdentifiers.filter((resourceIdentifier) => resourceIdentifier.type === 'route').map((resourceIdentifier) => resourceIdentifier.id);
    const contextTargets = [
      ...(routes.length > 0 ? routes.map((r) => `${this.baseUrl}${r}`) : [`${this.baseUrl}.*`])
      // ...(loginRoute ? [`${this.baseUrl}${loginRoute}`] : []) // login route isn't needed.
    ];
    // Zap can't handle running many calls in parallel, so we do it sequentially.
    await contextTargets.reduce(async (accum, cT) => {
      await accum;

      await this.zAp.aPi.context.includeInContext({ contextName, regex: cT })
        .then((resp) => {
          this.log.info(`Added URI: "${cT}" to Zap include-in-context: "${contextName}". Response was: ${JSON.stringify(resp)}.`, { tags: [this.#fileName, methodName] });
        })
        .catch((err) => {
          const errorText = `Error occurred while attempting to add URI: "${cT}" to Zap include-in-context: "${contextName}". Error was: ${err.message}.`;
          this.log.error(errorText, { tags: [this.#fileName, methodName] });
          throw new Error(errorText);
        });
    }, []);
    await excludedRoutes.reduce(async (accum, eR) => {
      await accum;

      await this.zAp.aPi.context.excludeFromContext({ contextName, regex: eR })
        .then((resp) => {
          this.log.info(`Added URI: "${eR}" to Zap exclude-from-context: "${contextName}". Response was: ${JSON.stringify(resp)}.`, { tags: [this.#fileName, methodName] });
        })
        .catch((err) => {
          const errorText = `Error occurred while attempting to add URI: "${eR}" to Zap exclude-from-context: "${contextName}". Error was: ${err.message}.`;
          this.log.error(errorText, { tags: [this.#fileName, methodName] });
          throw new Error(errorText);
        });
    }, []);

    await this.zAp.aPi.users.newUser({ contextId, name: 'NA' })
      .then((resp) => {
        userId = resp.userId;
        this.#setUserId(userId);
        this.log.info(`Add the newUser: "NA" of contextId: "${contextId}". Response was: ${JSON.stringify(resp)}.`, { tags: [this.#fileName, methodName] });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to add the newUser: "NA" of contextId: "${contextId}". Error was: ${err.message}.`;
        this.log.error(errorText, { tags: [this.#fileName, methodName] });
        throw new Error(errorText);
      });
  }
}

export default NoAuthentication;
