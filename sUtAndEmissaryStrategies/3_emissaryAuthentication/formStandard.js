// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

import EmissaryAuthentication from './strategy.js';
import { percentEncode } from '../../strings/index.js';

// Doc: https://www.zaproxy.org/docs/authentication/
// Doc: https://www.zaproxy.org/docs/desktop/start/features/authentication/
// Doc: https://www.zaproxy.org/docs/desktop/start/features/authmethods/
// Doc: https://www.zaproxy.org/docs/api/#getting-authenticated
// Doc: https://docs.google.com/document/d/1LSg8CMb4LI5yP-8jYDTVJw1ZIJD2W_WDWXLtJNk3rsQ/edit#

class FormStandard extends EmissaryAuthentication {
  #sutPropertiesSubSet;
  #setUserId;
  #emissaryPropertiesSubSet;
  #fileName = 'formStandard';

  constructor({ log, baseUrl, sutPropertiesSubSet, setUserId, emissaryPropertiesSubSet, zAp }) {
    super({ log, baseUrl, zAp });
    this.#sutPropertiesSubSet = sutPropertiesSubSet;
    this.#setUserId = setUserId;
    this.#emissaryPropertiesSubSet = emissaryPropertiesSubSet;
  }

  async configure() {
    const methodName = 'configure';
    const {
      authentication: { route: loginRoute, usernameFieldLocater, passwordFieldLocater },
      loggedInIndicator,
      loggedOutIndicator,
      testSession: { attributes: { username, password, excludedRoutes }, relationships: { data: testSessionResourceIdentifiers } },
      context: { id: contextId, name: contextName }
    } = this.#sutPropertiesSubSet;

    const loggedInOutIndicator = {
      command: loggedInIndicator ? 'setLoggedInIndicator' : 'setLoggedOutIndicator',
      value: loggedInIndicator || loggedOutIndicator,
      secondParamName: loggedInIndicator ? 'loggedInIndicatorRegex' : 'loggedOutIndicatorRegex'
    };

    const { maxDepth, threadCount } = this.#emissaryPropertiesSubSet;
    const enabled = true;
    const authenticationMethod = 'formBasedAuthentication';
    let userId;
    const authMethodConfigParams = `loginUrl=${this.baseUrl}${loginRoute}&loginRequestData=${usernameFieldLocater}%3D%7B%25username%25%7D%26${passwordFieldLocater}%3D%7B%25password%25%7D`;
    const authCredentialsConfigParams = `username=${username}&password=${percentEncode(password)}`;

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

    // Only the 'userName' onwards must be URL encoded. URL encoding entire line doesn't (or at least didn't used to) work.
    await this.zAp.aPi.authentication.setAuthenticationMethod({ contextId, authMethodName: authenticationMethod, authMethodConfigParams })
      .then((resp) => {
        this.log.info(`Set authentication method for contextId: "${contextId}" to: "${authenticationMethod}". Response was: ${JSON.stringify(resp)}.`, { tags: [this.#fileName, methodName] });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to set authentication method to "${authenticationMethod}". Error was: ${err.message}.`;
        this.log.error(errorText, { tags: [this.#fileName, methodName] });
        throw new Error(errorText);
      });
    await this.zAp.aPi.authentication[loggedInOutIndicator.command]({ contextId, [loggedInOutIndicator.secondParamName]: loggedInOutIndicator.value })
      .then((resp) => {
        this.log.info(`${loggedInOutIndicator.command} for contextId: "${contextId}" to: "${loggedInOutIndicator.value}". Response was: ${JSON.stringify(resp)}.`, { tags: [this.#fileName, methodName] });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to: ${loggedInOutIndicator.command} to: "${loggedInOutIndicator.value}". Error was: ${err.message}.`;
        this.log.error(errorText, { tags: [this.#fileName, methodName] });
        throw new Error(errorText);
      });

    await this.zAp.aPi.users.newUser({ contextId, name: username })
      .then((resp) => {
        userId = resp.userId;
        this.#setUserId(userId);
        this.log.info(`Add the newUser: "${username}" of contextId: "${contextId}". Response was: ${JSON.stringify(resp)}.`, { tags: [this.#fileName, methodName] });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to add the newUser: "${username}" of contextId: "${contextId}". Error was: ${err.message}.`;
        this.log.error(errorText, { tags: [this.#fileName, methodName] });
        throw new Error(errorText);
      });
    await this.zAp.aPi.users.setAuthenticationCredentials({ contextId, userId, authCredentialsConfigParams })
      .then((resp) => {
        this.log.info(`Set authentication credentials, of contextId: "${contextId}". Response was: ${JSON.stringify(resp)}.`, { tags: [this.#fileName, methodName] });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to set authentication credentials, of contextId: "${contextId}". Error was: ${err.message}.`;
        this.log.error(errorText, { tags: [this.#fileName, methodName] });
        throw new Error(errorText);
      });
    await this.zAp.aPi.users.setUserEnabled({ contextId, userId, enabled })
      .then((resp) => {
        this.log.info(`Set user enabled on user with id: "${userId}", of contextId: "${contextId}". Response was: ${JSON.stringify(resp)}.`, { tags: [this.#fileName, methodName] });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to set user enabled with id: "${userId}", of contextId: "${contextId}". Error was: ${err.message}.`;
        this.log.error(errorText, { tags: [this.#fileName, methodName] });
        throw new Error(errorText);
      });
    await this.zAp.aPi.forcedUser.setForcedUser({ contextId, userId })
      .then((resp) => {
        this.log.info(`Set forced user with Id: "${userId}" of contextId: "${contextId}". Response was: ${JSON.stringify(resp)}.`, { tags: [this.#fileName, methodName] });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to set forced user: "${userId}", of contextId: "${contextId}". Error was: ${err.message}.`;
        this.log.error(errorText, { tags: [this.#fileName, methodName] });
        throw new Error(errorText);
      });
    await this.zAp.aPi.forcedUser.setForcedUserModeEnabled({ boolean: enabled })
      .then((resp) => {
        this.log.info(`Set forced user mode enabled to: "${enabled}". Response was: ${JSON.stringify(resp)}.`, { tags: [this.#fileName, methodName] });
      })
      .catch((err) => {
        const errorText = `Error occurred while attempting to set forced user mode enabled to: "${enabled}". Error was: ${err.message}.`;
        this.log.error(errorText, { tags: [this.#fileName, methodName] });
        throw new Error(errorText);
      });
  }
}

export default FormStandard;
