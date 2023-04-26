// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

import { promises as fsPromises } from 'fs';
import { promisify } from 'util';
import { randomBytes } from 'crypto';
import config from '../../../config/config.js';
import SitesTreePopulation from './strategy.js';

const rndBytes = promisify(randomBytes);

// Doc: https://www.zaproxy.org/docs/desktop/addons/graphql-support/
// Doc: https://www.zaproxy.org/blog/2020-08-28-introducing-the-graphql-add-on-for-zap/

class GraphQl extends SitesTreePopulation {
  #emissaryPropertiesSubSet;
  #fileName = 'graphQl';

  constructor({ log, baseUrl, sutPropertiesSubSet, setContextId, emissaryPropertiesSubSet, zAp }) {
    super({ log, baseUrl, sutPropertiesSubSet, setContextId, zAp });
    this.#emissaryPropertiesSubSet = emissaryPropertiesSubSet;
  }

  async #importDefinitionFromUrl({ importUrl }) {
    const methodName = '#importDefinitionFromUrl';
    await this.zAp.aPi.graphql.importUrl({ url: importUrl, endurl: this.baseUrl })
      .then((resp) => {
        this.log.info(`Loaded GraphQL definition from URL into the Emissary. Response was: ${JSON.stringify(resp)}.`, { tags: [this.#fileName, methodName] });
      }).catch((err) => {
        const buildUserErrorText = 'Error occurred while attempting to load the GraphQL definition from URL into the Emissary';
        const adminErrorText = `${buildUserErrorText}. Error was: ${err.message}`;
        this.log.error(adminErrorText, { tags: [this.#fileName, methodName] });
        throw new Error(adminErrorText);
      });
  }

  async #importDefinitionFromFileContent({ importFileContentBase64 }) {
    const methodName = '#importDefinitionFromFileContent';
    const { dir: appTesterUploadDir } = config.get('upload');
    const emissaryUploadDir = this.#emissaryPropertiesSubSet; // uploadDir is no longer needed or available.

    // Need to copy file as unique name so that another Test Session is unable to delete it before we load it into the Emissary.
    let rndFilePrefix = '';
    await rndBytes(4)
      .then((buf) => {
        rndFilePrefix = buf.toString('hex');
      })
      .catch((err) => {
        const adminErrorText = `Error (non fatal) occurred while attempting to get randomBytes for file prefix. Error was: ${err.message}`;
        this.log.error(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
      });
    const fileNameNoPrefix = 'GraphQlDefinition';
    const fileNameWithPrefix = `${rndFilePrefix}-${fileNameNoPrefix}`;
    const buff = Buffer.from(importFileContentBase64, 'base64');

    await fsPromises.writeFile(`${appTesterUploadDir}${fileNameWithPrefix}`, buff)
      .then(() => {
        this.log.info(`GraphQL definition: "${fileNameNoPrefix}" was successfully written to the App Tester upload directory.`, { tags: [this.#fileName, methodName] });
      })
      .catch((err) => {
        const buildUserErrorText = `Error occurred while attempting to write the GraphQL definition from file: "${fileNameNoPrefix}" to the App Tester upload directory for the Emissary consumption`;
        const adminErrorText = `${buildUserErrorText}. Error was: ${err.message}`;
        this.log.error(adminErrorText, { tags: [this.#fileName, methodName] });
        throw new Error(adminErrorText);
      });
    await this.zAp.aPi.graphql.importFile({ file: `${emissaryUploadDir}${fileNameWithPrefix}`, endurl: this.baseUrl }) // uploadDir is no longer needed or available.
      .then((resp) => {
        this.log.info(`Loaded GraphQL definition from file: "${fileNameNoPrefix}" into the Emissary. Response was: ${JSON.stringify(resp)}.`, { tags: [this.#fileName, methodName] });
      }).catch((err) => {
        const buildUserErrorText = `Error occurred while attempting to load the GraphQL definition from file: "${fileNameNoPrefix}" into the Emissary`;
        const adminErrorText = `${buildUserErrorText}. Error was: ${err.message}`;
        this.log.error(adminErrorText, { tags: [this.#fileName, methodName] });
        throw new Error(adminErrorText);
      });
    await fsPromises.rm(`${appTesterUploadDir}${fileNameWithPrefix}`)
      .then(() => {
        this.log.info(`Removed GraphQL definition file: "${fileNameNoPrefix}" from the App Tester upload directory.`, { tags: [this.#fileName, methodName] });
      })
      .catch((err) => {
        const buildUserErrorText = `Error occurred while attempting to remove the GraphQL definition file: "${fileNameNoPrefix}" from the App Tester upload directory after loading into the Emissary`;
        const adminErrorText = `${buildUserErrorText}. Error was: ${err.message}`;
        this.log.error(adminErrorText, { tags: [this.#fileName, methodName] });
      });
  }

  async #setOptions({ options }) {
    const methodName = '#setOptions';
    const opts = Object.entries(options);
    const key = 0;
    const val = 1;

    const paramName = (value) => {
      if (Number.isInteger(value)) return 'Integer';
      if (typeof value === 'boolean') return 'Boolean';
      return 'String';
    };

    await Promise.all(opts.map(async (o) => {
      await this.zAp.aPi.graphql[o[key]]({ [paramName(o[val])]: o[val] })
        .then((resp) => {
          this.log.info(`Set GraphQL option: "${o[key]}" to: "${o[val]}", in the Emissary. Response was: ${JSON.stringify(resp)}.`, { tags: [this.#fileName, methodName] });
        }).catch((err) => {
          const buildUserErrorText = `Error occurred while attempting to set GraphQL option: "${o[key]}" to: "${o[val]}": in the Emissary`;
          const adminErrorText = `${buildUserErrorText}. Error was: ${err.message}`;
          this.log.error(adminErrorText, { tags: [this.#fileName, methodName] });
          throw new Error(adminErrorText);
        });
    }));
  }

  async populate() {
    const methodName = 'populate';
    const {
      testSession: { attributes: { graphQl: { importFileContentBase64, importUrl, ...options } } },
      context: { name: contextName }
    } = this.sutPropertiesSubSet;

    this.log.info(`The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, { tags: [this.#fileName, methodName] });

    await this.setContextIdForSut(contextName);

    importUrl ? await this.#importDefinitionFromUrl({ importUrl }) : await this.#importDefinitionFromFileContent({ importFileContentBase64 });

    await this.#setOptions({ options });
  }
}

export default GraphQl;

