// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

import Scanning from './strategy.js';

class BrowserAppStandard extends Scanning {
  #sutPropertiesSubSet;
  #emissaryPropertiesSubSet;
  #fileName = 'browserAppStandard';

  constructor({ log, baseUrl, sutPropertiesSubSet, emissaryPropertiesSubSet, zAp }) {
    super({ log, baseUrl, zAp });
    this.#sutPropertiesSubSet = sutPropertiesSubSet;
    this.#emissaryPropertiesSubSet = emissaryPropertiesSubSet;
  }

  async scan() {
    const methodName = 'scan';
    const {
      testSession: { relationships: { data: testSessionResourceIdentifiers } },
      testRoutes: routeResourceObjects,
      context: { id: contextId },
      userId // Provided by Zap
    } = this.#sutPropertiesSubSet;
    const {
      apiFeedbackSpeed,
      spider: { maxChildren }
    } = this.#emissaryPropertiesSubSet;
    const that = this;
    const recurse = true;
    const subtreeOnly = true;

    const routes = testSessionResourceIdentifiers.filter((resourceIdentifier) => resourceIdentifier.type === 'route').map((resourceIdentifier) => resourceIdentifier.id);
    const routeResourceObjectsOfSession = [...(routeResourceObjects ? routeResourceObjects.filter((routeResourceObject) => routes.includes(routeResourceObject.id)) : [])];

    let numberOfAlertsForSesh = 0;
    let sutAttackUrl;
    let scanTargetIdForAscanCallback;
    let scanId;

    this.log.info(`The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, { tags: [this.#fileName, methodName] });

    const zapApiSpiderScanAsUser = ({ zapResult, contextTarget }) => {
      const spiderScanId = zapResult.scanAsUser;
      let runStatus = true;
      const spiderScanAsUserLogText = `Spider scan as user: "${userId}", for URL: "${contextTarget}", context: "${contextId}", with scanAsUser Id: "${spiderScanId}", with maxChildren: "${maxChildren}", with recurse: "${recurse}", with subtreeOnly: "${subtreeOnly}" was called. Response was: ${JSON.stringify(zapResult)}.`;
      this.log.info(spiderScanAsUserLogText, { tags: [this.#fileName, methodName] });
      return new Promise((resolve, reject) => {
        let statusValueForSpiderScanAsUser = 'no status yet';
        let zapError;
        let zapInProgressIntervalId;

        async function status() {
          if (!runStatus) return;
          await that.zAp.aPi.spider.viewStatus({ scanId: spiderScanId }).then(
            (result) => {
              if (result) statusValueForSpiderScanAsUser = parseInt(result.status, 10);
              else statusValueForSpiderScanAsUser = undefined;
            },
            (error) => {
              if (error) zapError = (error.error.code === 'ECONNREFUSED') ? error.message : '';
            }
          );
        }
        zapInProgressIntervalId = setInterval(() => { // eslint-disable-line prefer-const
          status();
          if ((zapError && statusValueForSpiderScanAsUser !== 100) || (statusValueForSpiderScanAsUser === undefined)) {
            this.log.error(`Cancelling test. Zap API is unreachable. ${zapError ? `Zap Error: ${zapError}` : 'No status value available, may be due to incorrect api key.'}`, { tags: [this.#fileName, methodName] });
            clearInterval(zapInProgressIntervalId);
            reject(new Error(`Test failure: ${zapError}`));
          } else if (statusValueForSpiderScanAsUser === 100) {
            const spiderFinishingScanAsUserLogText = `The spider is finishing scan as user: "${userId}", for URL: "${contextTarget}", context: "${contextId}", with scanAsUser Id: "${spiderScanId}".`;
            this.log.info(spiderFinishingScanAsUserLogText, { tags: [this.#fileName, methodName] });
            clearInterval(zapInProgressIntervalId);
            runStatus = false;
            resolve();
          }
        }, apiFeedbackSpeed);
      });
    };

    const zapApiAscanScanPerRoute = (zapResult) => {
      scanId = zapResult.scan;
      let runStatus = true;
      return new Promise((resolver, reject) => {
        let statusValueForRoute = 'no status yet';
        let zapError;
        let zapInProgressIntervalId;
        this.log.info(`Active scan initiated for scan target: "${scanTargetIdForAscanCallback}". Response was: ${JSON.stringify(zapResult)}.`, { tags: [this.#fileName, methodName] });

        let numberOfAlertsForRoute = 0;
        async function status() {
          if (!runStatus) return;
          await that.zAp.aPi.ascan.viewStatus({ scanId }).then(
            (result) => {
              if (result) statusValueForRoute = parseInt(result.status, 10);
              else statusValueForRoute = undefined;
            },
            (error) => {
              // If we get 'ECONNREFUSED', we may need to increase the number of retries from the default (2).
              zapError = (error.code === 'ECONNREFUSED') ? error.message : '';
              that.log.error(`An error occurred while attempting to get active scan status from Zap. The error was: "${error.message}".`, { tags: [that.#fileName, methodName] });
            }
          );
          await that.zAp.aPi.core.viewNumberOfAlerts({ baseurl: sutAttackUrl }).then(
            (result) => {
              if (result) numberOfAlertsForRoute = parseInt(result.numberOfAlerts, 10);
              if (runStatus) {
                that.log.notice(`Scan ${scanId} is ${`${statusValueForRoute}%`.padEnd(4)} complete with ${`${numberOfAlertsForRoute}`.padEnd(3)} alerts for scan target: "${scanTargetIdForAscanCallback}".`, { tags: [that.#fileName, methodName] });
              }
            },
            (error) => { zapError = error.message; }
          );
        }
        zapInProgressIntervalId = setInterval(() => { // eslint-disable-line prefer-const
          status();
          if ((zapError && statusValueForRoute !== 100) || (statusValueForRoute === undefined)) {
            that.log.error(`Cancelling test. Zap API is unreachable. Zap Error: ${zapError}`, { tags: [that.#fileName, methodName] });
            clearInterval(zapInProgressIntervalId);
            reject(new Error(`Test failure: ${zapError}`));
          } else if (statusValueForRoute === 100) {
            that.log.notice(`Finishing scan ${scanId} for scan target: "${scanTargetIdForAscanCallback}". Please see the report for further details.`, { tags: [that.#fileName, methodName] });
            clearInterval(zapInProgressIntervalId);
            numberOfAlertsForSesh += numberOfAlertsForRoute;
            // status();
            // resolveOfPromiseWithinPromiseOfAscan();

            runStatus = false;
            resolver(`Finishing scan ${scanId} for scan target: "${scanTargetIdForAscanCallback}". Please see the report for further details.`);
          }
        }, apiFeedbackSpeed);
      });
    };

    this.log.debug(`spider.scanAsUser is about to receive the following arguements: contextId: "${contextId}", userId: "${userId}", sutBaseUrl: "${this.baseUrl}", maxChildren: "${maxChildren}".`, { tags: [this.#fileName, methodName] });

    const contextTargets = [
      ...(routes.length > 0 ? routes.map((r) => `${this.baseUrl}${r}`) : [`${this.baseUrl}`])
    ];
    await contextTargets.reduce(async (accum, cT) => {
      await accum;
      // ZAP will run the (enabled) passive scan rules against all URLs that are either proxied through ZAP or visited by either of the spiders: https://stackoverflow.com/questions/35942385/passive-scan-in-owasp-zap
      await this.zAp.aPi.spider.scanAsUser({ contextId, userId, url: cT, maxChildren, recurse, subtreeOnly })
        .then(async (resp) => {
          await zapApiSpiderScanAsUser({ zapResult: resp, contextTarget: cT });
        })
        .catch((err) => {
          const errorText = `Error occurred in spider while attempting to scan: "${cT}" as user. Error was: ${err.message ? err.message : err}`;
          this.log.error(errorText, { tags: [this.#fileName, methodName] });
          throw new Error(errorText);
        });
    }, []);

    const startScanOf = {
      routeResourceObjectsOfSession: async () => {
        for (const routeResourceObject of routeResourceObjectsOfSession) { // eslint-disable-line no-restricted-syntax
          scanTargetIdForAscanCallback = routeResourceObject.id;
          const postData = `${routeResourceObject.attributes.attackFields.reduce((queryString, queryParameterObject) => `${queryString}${queryString === '' ? '' : '&'}${queryParameterObject.name}=${queryParameterObject.value}`, '')}`;
          sutAttackUrl = `${this.baseUrl}${routeResourceObject.id}`;
          this.log.info(`The sutAttackUrl is: "${sutAttackUrl}". The post data is: "${postData}". The contextId is: ${contextId}`, { tags: [this.#fileName, methodName] });

          // http://172.17.0.2:8080/UI/acsrf/ allows to add csrf tokens.

          await this.zAp.aPi.ascan.scan({ url: sutAttackUrl, recurse, inScopeOnly: false, scanPolicyName: '', method: routeResourceObject.attributes.method, postData, contextId }) // eslint-disable-line no-await-in-loop
            .then(zapApiAscanScanPerRoute)
            .catch((err) => { // eslint-disable-line no-loop-func
              const errorText = `Error occurred while attempting to initiate active scan of target: "${sutAttackUrl}". Error was: ${err.message ? err.message : err}`;
              this.log.error(errorText, { tags: [this.#fileName, methodName] });
              throw new Error(errorText);
            });
        }
      },
      baseUrl: async () => {
        scanTargetIdForAscanCallback = this.baseUrl;
        sutAttackUrl = this.baseUrl;
        this.log.info(`Their are no routeResourceObjects for this Test Session. About to ascan: "${sutAttackUrl}". The contextId is: ${contextId}`, { tags: [this.#fileName, methodName] });
        // inScopeOnly is ignored if a contextId is specified.
        await this.zAp.aPi.ascan.scan({ url: sutAttackUrl, recurse, inScopeOnly: false, scanPolicyName: '', method: '', postData: '', contextId }) // eslint-disable-line no-await-in-loop
          .then(zapApiAscanScanPerRoute)
          .catch((err) => { // eslint-disable-line no-loop-func
            const errorText = `Error occurred while attempting to initiate active scan of target: "${sutAttackUrl}". Error was: ${err.message ? err.message : err}`;
            this.log.error(errorText, { tags: [this.#fileName, methodName] });
            throw new Error(errorText);
          });
      }
    };
    await startScanOf[routeResourceObjectsOfSession.length > 0 ? 'routeResourceObjectsOfSession' : 'baseUrl']();

    this.zAp.numberOfAlertsForSesh(numberOfAlertsForSesh);
  }
}

export default BrowserAppStandard;
