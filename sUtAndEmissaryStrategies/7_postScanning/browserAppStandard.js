// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

import PostScanning from './strategy.js';

class BrowserAppStandard extends PostScanning {
  #sutPropertiesSubSet;
  #fileName = 'browserAppStandard';

  constructor({ log, baseUrl, sutPropertiesSubSet, zAp }) {
    super({ log, baseUrl, zAp });
    this.#sutPropertiesSubSet = sutPropertiesSubSet;
  }

  process() {
    const methodName = 'process';
    const { attributes: { alertThreshold }, relationships: { data: testSessionResourceIdentifiers } } = this.#sutPropertiesSubSet;
    const routes = testSessionResourceIdentifiers.filter((resourceIdentifier) => resourceIdentifier.type === 'route').map((resourceIdentifier) => resourceIdentifier.id);

    this.log.info(`The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, { tags: [this.#fileName, methodName] });

    const numberOfAlertsForSesh = this.zAp.numberOfAlertsForSesh();

    if (numberOfAlertsForSesh > alertThreshold) {
      // The following message assumes that the Scanning strategy behaves a certain way, so the BrowserAppStandard Scanning and BrowserAppStandard PostScanning are coupled.
      this.log.notice(`Search the generated report for the ${routes.length ? `routes: [${routes}]` : `URL: "${this.baseUrl}"`}, to see the: "${numberOfAlertsForSesh - alertThreshold}" vulnerabilities that exceed the Build User defined alert threshold of: "${alertThreshold}".`, { tags: [this.#fileName, methodName] });
      this.log.notice(`The number of alerts (${numberOfAlertsForSesh}) should be no greater than the alert threshold (${alertThreshold}).`, { tags: [this.#fileName, methodName] });
    } else {
      this.log.notice('Well done, this Test Session passed!', { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
    }
  }
}

export default BrowserAppStandard;
