// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

import SitesTreePopulation from './strategy.js';

class WebDriverStandard extends SitesTreePopulation {
  #browser;
  #fileName = 'webDriverStandard';

  constructor({ log, baseUrl, browser, sutPropertiesSubSet, setContextId, zAp }) {
    super({ log, baseUrl, sutPropertiesSubSet, setContextId, zAp });
    this.#browser = browser;
  }

  async populate() {
    const methodName = 'populate';
    const { findElementThenClick, findElementThenClear, findElementThenSendKeys } = this.#browser;
    const {
      testSession: { relationships: { data: testSessionResourceIdentifiers } },
      context: { name: contextName },
      testRoutes: routeResourceObjects
    } = this.sutPropertiesSubSet;
    const routes = testSessionResourceIdentifiers.filter((resourceIdentifier) => resourceIdentifier.type === 'route').map((resourceIdentifier) => resourceIdentifier.id);
    const routeResourceObjectsOfSession = [...(routeResourceObjects ? routeResourceObjects.filter((routeResourceObject) => routes.includes(routeResourceObject.id)) : [])];
    const webDriver = this.#browser.getWebDriver();

    this.log.info(`The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, { tags: [this.#fileName, methodName] });

    await this.setContextIdForSut(contextName);

    await routeResourceObjectsOfSession.reduce(async (accum, routeResourceObject) => {
      await accum;

      await webDriver.sleep(1000)
        .then(() => {
          this.log.info(`Navigating route id "${routeResourceObject.id}".`, { tags: [this.#fileName, methodName] });
          return webDriver.get(`${this.baseUrl}${routeResourceObject.id}`);
        })
        .then(() => webDriver.sleep(1000))
        .then(() => Promise.all(routeResourceObject.attributes.attackFields.map((attackField) => findElementThenClear(attackField))))
        .then(() => Promise.all(routeResourceObject.attributes.attackFields.map((attackField) => findElementThenSendKeys(attackField))))
        .then(() => findElementThenClick(routeResourceObject.attributes.submit))
        .then(() => webDriver.sleep(1000))
        .catch((err) => {
          this.log.error(err.message, { tags: [this.#fileName, methodName] });
          throw new Error(`Error occurred while navigating route "${routeResourceObject.id}". The error was: ${err}`);
        });

      return [...(await accum), routeResourceObject];
    }, []);
  }
}

export default WebDriverStandard;
