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

// Doc: https://www.zaproxy.org/docs/desktop/addons/soap-support/

class Soap extends SitesTreePopulation {
  #emissaryPropertiesSubSet;
  #fileName = 'sOap';

  constructor({ log, baseUrl, sutPropertiesSubSet, setContextId, emissaryPropertiesSubSet, zAp }) {
    super({ log, baseUrl, sutPropertiesSubSet, setContextId, zAp });
    this.#emissaryPropertiesSubSet = emissaryPropertiesSubSet;
  }

  async #importDefinitionFromUrl({ importUrl }) {
    const methodName = '#importDefinitionFromUrl';
    await this.zAp.aPi.soap.importUrl({ url: importUrl })
      .then((resp) => {
        this.log.info(`Loaded SOAP definition from URL into the Emissary. Response was: ${JSON.stringify(resp)}.`, { tags: [this.#fileName, methodName] });
      }).catch((err) => {
        const buildUserErrorText = 'Error occurred while attempting to load the SOAP definition from URL into the Emissary';
        const adminErrorText = `${buildUserErrorText}, Error was: ${err.message}`;
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
        this.log.error(`Error (non fatal) occurred while attempting to get randomBytes for file prefix. Error was: ${err.message}`, { tags: [this.#fileName, methodName] });
      });
    const fileNameNoPrefix = 'SOAPDefinition';
    const fileNameWithPrefix = `${rndFilePrefix}-${fileNameNoPrefix}`;
    const buff = Buffer.from(importFileContentBase64, 'base64');

    await fsPromises.writeFile(`${appTesterUploadDir}${fileNameWithPrefix}`, buff)
      .then(() => {
        this.log.info(`SOAP definition: "${fileNameNoPrefix}" was successfully written to the App Tester upload directory.`, { tags: [this.#fileName, methodName] });
      })
      .catch((err) => {
        const buildUserErrorText = `Error occurred while attempting to write the SOAP definition from file: "${fileNameNoPrefix}" to the App Tester upload directory for the Emissary consumption`;
        const adminErrorText = `${buildUserErrorText}. Error was: ${err.message}`;
        this.log.error(adminErrorText, { tags: [this.#fileName, methodName] });
        throw new Error(adminErrorText);
      });
    await this.zAp.aPi.soap.importFile({ file: `${emissaryUploadDir}${fileNameWithPrefix}` }) // uploadDir is no longer needed or available.
      .then((resp) => {
        this.log.info(`Loaded SOAP definition from file: "${fileNameNoPrefix}" into the Emissary. Response was: ${JSON.stringify(resp)}.`, { tags: [this.#fileName, methodName] });
      }).catch((err) => {
        const buildUserErrorText = `Error occurred while attempting to load the SOAP definition from file: "${fileNameNoPrefix}" into the Emissary`;
        const adminErrorText = `${buildUserErrorText}. Error was: ${err.message}`;
        this.log.error(adminErrorText, { tags: [this.#fileName, methodName] });
        throw new Error(adminErrorText);
      });
    await fsPromises.rm(`${appTesterUploadDir}${fileNameWithPrefix}`)
      .then(() => {
        this.log.info(`Removed SOAP definition file: "${fileNameNoPrefix}" from the App Tester upload directory.`, { tags: [this.#fileName, methodName] });
      })
      .catch((err) => {
        const buildUserErrorText = `Error occurred while attempting to remove the SOAP definition file: "${fileNameNoPrefix}" from the App Tester upload directory after loading into the Emissary`;
        const adminErrorText = `${buildUserErrorText}. Error was: ${err.message}`;
        this.log.error(adminErrorText, { tags: [this.#fileName, methodName] });
      });
  }

  async populate() {
    const methodName = 'populate';
    const {
      testSession: { attributes: { soap: { importFileContentBase64, importUrl } } },
      context: { name: contextName }
    } = this.sutPropertiesSubSet;

    this.log.info(`The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, { tags: [this.#fileName, methodName] });

    await this.setContextIdForSut(contextName);

    importUrl ? await this.#importDefinitionFromUrl({ importUrl }) : await this.#importDefinitionFromFileContent({ importFileContentBase64 });
  }
}

export default Soap;
