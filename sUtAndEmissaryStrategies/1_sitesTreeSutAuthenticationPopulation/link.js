// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

import SitesTreeSutAuthenticationPopulation from './strategy.js';

class Link extends SitesTreeSutAuthenticationPopulation {
  #fileName = 'link';

  constructor({ log, baseUrl, browser, sutPropertiesSubSet }) {
    super({ log, baseUrl, browser, sutPropertiesSubSet });
  }

  async authenticate() {
    const methodName = 'authenticate';
    const { checkAndNotifyBuildUserIfAnyKnownBrowserErrors, checkUserIsAuthenticated } = this.browser;
    const { authentication: { route: loginRoute, expectedPageSourceSuccess } } = this.sutPropertiesSubSet;

    this.log.info(`The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, { tags: [this.#fileName, methodName] });

    const webDriver = this.browser.getWebDriver();
    await webDriver.getWindowHandle();
    await webDriver.get(`${this.baseUrl}${loginRoute}`);
    await checkAndNotifyBuildUserIfAnyKnownBrowserErrors();
    await checkUserIsAuthenticated(expectedPageSourceSuccess);
  }
}

export default Link;
