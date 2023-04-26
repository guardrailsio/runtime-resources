// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

import SitesTreeSutAuthenticationPopulation from './strategy.js';

class FormStandard extends SitesTreeSutAuthenticationPopulation {
  #fileName = 'formStandard';

  constructor({ log, baseUrl, browser, sutPropertiesSubSet }) {
    super({ log, baseUrl, browser, sutPropertiesSubSet });
  }

  async authenticate() {
    const methodName = 'authenticate';
    const { findElementThenClick, findElementThenSendKeys, checkAndNotifyBuildUserIfAnyKnownBrowserErrors } = this.browser;
    const {
      authentication: { route: loginRoute, usernameFieldLocater, passwordFieldLocater, submit, expectedPageSourceSuccess },
      testSession: { attributes: { username, password } }
    } = this.sutPropertiesSubSet;

    this.log.info(`The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, { tags: [this.#fileName, methodName] });

    const webDriver = this.browser.getWebDriver();
    await webDriver.getWindowHandle();
    await webDriver.get(`${this.baseUrl}${loginRoute}`);
    await checkAndNotifyBuildUserIfAnyKnownBrowserErrors();
    await findElementThenSendKeys({ name: usernameFieldLocater, value: username, visible: true });
    await findElementThenSendKeys({ name: passwordFieldLocater, value: password, visible: true });
    await findElementThenClick(submit, expectedPageSourceSuccess);
  }
}

export default FormStandard;
