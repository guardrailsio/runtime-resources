// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

import Scanners from './strategy.js';

class BrowserAppStandard extends Scanners {
  #sutPropertiesSubSet;
  #fileName = 'browserAppStandard';
  #scanPolicyName = '';
  #policyId = '';

  constructor({ log, baseUrl, sutPropertiesSubSet, zAp }) {
    super({ log, baseUrl, zAp });
    this.#sutPropertiesSubSet = sutPropertiesSubSet;
  }

  async configurePassiveScanners() {
    const methodName = 'configurePassiveScanners';
    const lowValuePassiveScanners = [
      { name: 'Private IP Disclosure', id: '2' },
      { name: 'Incomplete or No Cache-control Header Set', id: '10015' },
      { name: 'Cross-Domain JavaScript Source File Inclusion', id: '10017' },
      { name: 'Information Disclosure - Sensitive Information in URL', id: '10024' },
      { name: 'Information Disclosure - Sensitive Information in HTTP Referrer Header', id: '10025' },
      { name: 'Information Disclosure - Suspicious Comments', id: '10027' },
      { name: 'Username Hash Found', id: '10057' },
      { name: 'Timestamp Disclosure', id: '10096' },
      { name: 'Charset Mismatch', id: '90011' },
      { name: 'WSDL File Detection', id: '90030' },
      { name: 'Loosely Scoped Cookie', id: '90033' }
    ];
    const lowValuePassiveScannerIds = lowValuePassiveScanners.map((lvps) => lvps.id).reduce((accum, currentId) => (accum === '' ? currentId : `${accum},${currentId}`), '');

    await this.zAp.aPi.pscan.disableScanners({ ids: lowValuePassiveScannerIds, scanPolicyName: this.#scanPolicyName })
      .then((resp) => {
        this.log.info(`Disable passive scanners for scanners with ids (${lowValuePassiveScannerIds}) was called. Response was: ${JSON.stringify(resp)}.`, { tags: [this.#fileName, methodName] });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to disable passive scanners (${lowValuePassiveScannerIds}). Error was: ${err.message}.`;
        this.log.error(errorText, { tags: [this.#fileName, methodName] });
        throw new Error(errorText);
      });
  }

  async configureActiveScanners() {
    const methodName = 'configureActiveScanners';
    const { attributes: { aScannerAttackStrength, aScannerAlertThreshold } } = this.#sutPropertiesSubSet;
    const domXssScannerId = 40026;
    let aScanners;

    this.log.info(`The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, { tags: [this.#fileName, methodName] });

    await this.zAp.aPi.ascan.disableAllScanners({ scanPolicyName: this.#scanPolicyName })
      .then((resp) => {
        this.log.info(`Disable all active scanners was called. Response was: ${JSON.stringify(resp)}.`, { tags: [this.#fileName, methodName] });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to disable all active scanners. Error was: ${err.message}.`;
        this.log.error(errorText, { tags: [this.#fileName, methodName] });
        throw new Error(errorText);
      });
    await this.zAp.aPi.ascan.enableAllScanners({ scanPolicyName: this.#scanPolicyName })
      .then((resp) => {
        this.log.info(`Enable all active scanners was called. Response was: ${JSON.stringify(resp)}.`, { tags: [this.#fileName, methodName] });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to enable all active scanners. Error was: ${err.message}.`;
        this.log.error(errorText, { tags: [this.#fileName, methodName] });
        throw new Error(errorText);
      });
    // Disable DOM XSS active scanner because on some routes it can take far too long (30 minutes on NodeGoat /memos).
    // The DOM XSS was a new add-on in Zap 2.10.0 https://www.zaproxy.org/docs/desktop/releases/2.10.0/#new-add-ons
    // If you query the scanners: http://zap:8080/HTML/ascan/view/scanners/ you'll also see that it is beta quality when writing this (2021-06-03)
    await this.zAp.aPi.ascan.disableScanners({ ids: domXssScannerId, scanPolicyName: this.#scanPolicyName })
      .then((resp) => {
        this.log.info(`Disable DOM XSS active scanner was called. Response was: ${JSON.stringify(resp)}.`, { tags: [this.#fileName, methodName] });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to disable DOM XSS active scanner. Error was: ${err.message}.`;
        this.log.error(errorText, { tags: [this.#fileName, methodName] });
        throw new Error(errorText);
      });
    await this.zAp.aPi.ascan.viewScanners({ scanPolicyName: this.#scanPolicyName, policyId: this.#policyId })
      .then((resp) => {
        aScanners = resp.scanners;
        this.log.info(`Obtained all ${aScanners.length} active scanners from Zap.`, { tags: [this.#fileName, methodName] });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to get all active scanners from Zap. Error was: ${err.message}.`;
        this.log.error(errorText, { tags: [this.#fileName, methodName] });
        throw new Error(errorText);
      });

    const enabledAScanners = aScanners.filter((e) => e.enabled === 'true');

    this.log.info(`Setting attack strengths and alert thresholds for the ${enabledAScanners.length} enabled active scanners.`, { tags: [this.#fileName, methodName] });

    for (const ascanner of enabledAScanners) { // eslint-disable-line no-restricted-syntax
      // eslint-disable-next-line no-await-in-loop
      await this.zAp.aPi.ascan.setScannerAttackStrength({ id: ascanner.id, attackStrength: aScannerAttackStrength, scanPolicyName: this.#scanPolicyName }).then(
        (result) => this.log.info(`Attack strength has been set: ${JSON.stringify(result)} for active scanner: { id: ${ascanner.id.padEnd(5)}, name: ${ascanner.name}}.`, { tags: [this.#fileName, methodName] }),
        (error) => this.log.error(`Error occurred while attempting to set the attack strength for active scanner: { id: ${ascanner.id}, name: ${ascanner.name}}. The error was: ${error.message}.`, { tags: [this.#fileName, methodName] })
      );
      // eslint-disable-next-line no-await-in-loop
      await this.zAp.aPi.ascan.setScannerAlertThreshold({ id: ascanner.id, alertThreshold: aScannerAlertThreshold, scanPolicyName: this.#scanPolicyName }).then(
        (result) => this.log.info(`Alert threshold has been set: ${JSON.stringify(result)} for active scanner: { id: ${ascanner.id.padEnd(5)}, name: ${ascanner.name}}.`, { tags: [this.#fileName, methodName] }),
        (error) => this.log.error(`Error occurred while attempting to set the alert threshold for active scanner: { id: ${ascanner.id}, name: ${ascanner.name}. The error was: ${error.message}.`, { tags: [this.#fileName, methodName] })
      );
    }

    const zApApiPrintEnabledAScanersFuncCallback = (result) => { // eslint-disable-line no-unused-vars
      const scannersStateForBuildUser = result.scanners.reduce((all, each) => `${all}\nname: ${each.name.padEnd(52)}, id: ${each.id.padEnd(6)}, enabled: ${each.enabled.padEnd(5)}, attackStrength: ${each.attackStrength.padEnd(7)}, alertThreshold: ${each.alertThreshold.padEnd(7)}`, '');
      // This is for the Build User and the PurpleTeam admin:
      this.log.info(`\n\nThe following are all the active scanners available with their current state:\n${scannersStateForBuildUser}\n`, { tags: [this.#fileName, methodName, 'pt-build-user'] });
      // This is for the PurpleTeam admin only:
      this.log.info(`\n\nThe following are all the active scanners available with their current state:\n\n${JSON.stringify(result, null, 2)}\n\n`, { tags: [this.#fileName, methodName, 'pt-admin'] });
    };
    await this.zAp.aPi.ascan.viewScanners({ scanPolicyName: this.#scanPolicyName, policyId: this.#policyId }).then(zApApiPrintEnabledAScanersFuncCallback, (err) => `Error occurred while attempting to get the configured active scanners for display. Error was: ${err.message}.`);
  }
}

export default BrowserAppStandard;
