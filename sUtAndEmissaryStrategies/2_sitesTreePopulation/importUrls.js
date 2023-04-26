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

// Doc: https://www.zaproxy.org/docs/desktop/addons/import-urls/

class ImportUrls extends SitesTreePopulation {
  #emissaryPropertiesSubSet;
  #fileName = 'importUrls';

  constructor({ log, baseUrl, sutPropertiesSubSet, setContextId, emissaryPropertiesSubSet, zAp }) {
    super({ log, baseUrl, sutPropertiesSubSet, setContextId, zAp });
    this.#emissaryPropertiesSubSet = emissaryPropertiesSubSet;
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
        this.log.error(adminErrorText, { tags: [this.#fileName, methodName] });
      });
    const fileNameNoPrefix = 'ImportURLs';
    const fileNameWithPrefix = `${rndFilePrefix}-${fileNameNoPrefix}`;
    const buff = Buffer.from(importFileContentBase64, 'base64');

    await fsPromises.writeFile(`${appTesterUploadDir}${fileNameWithPrefix}`, buff)
      .then(() => {
        this.log.info(`ImportURLs: "${fileNameNoPrefix}" was successfully written to the App Tester upload directory.`, { tags: [this.#fileName, methodName] });
      })
      .catch((err) => {
        const buildUserErrorText = `Error occurred while attempting to write the ImportURLs from file: "${fileNameNoPrefix}" to the App Tester upload directory for the Emissary consumption`;
        const adminErrorText = `${buildUserErrorText}. Error was: ${err.message}`;
        this.log.error(adminErrorText, { tags: [this.#fileName, methodName] });
        throw new Error(adminErrorText);
      });
    await this.zAp.aPi.importurls.importFile({ filePath: `${emissaryUploadDir}${fileNameWithPrefix}` }) // uploadDir is no longer needed or available.
      .then((resp) => {
        this.log.info(`Loaded ImportURLs from file: "${fileNameNoPrefix}" into the Emissary. Response was: ${JSON.stringify(resp)}.`, { tags: [this.#fileName, methodName] });
      }).catch((err) => {
        const buildUserErrorText = `Error occurred while attempting to load the ImportURLs from file: "${fileNameNoPrefix}" into the Emissary`;
        const adminErrorText = `${buildUserErrorText}. Error was: ${err.message}`;
        this.log.error(adminErrorText, { tags: [this.#fileName, methodName] });
        throw new Error(adminErrorText);
      });
    await fsPromises.rm(`${appTesterUploadDir}${fileNameWithPrefix}`)
      .then(() => {
        this.log.info(`Removed ImportURLs file: "${fileNameNoPrefix}" from the App Tester upload directory.`, { tags: [this.#fileName, methodName] });
      })
      .catch((err) => {
        const buildUserErrorText = `Error occurred while attempting to remove the ImportURLs file: "${fileNameNoPrefix}" from the App Tester upload directory after loading into the Emissary`;
        const adminErrorText = `${buildUserErrorText}. Error was: ${err.message}`;
        this.log.error(adminErrorText, { tags: [this.#fileName, methodName] });
      });
  }

  async populate() {
    const methodName = 'populate';
    const {
      testSession: { attributes: { importUrls: { importFileContentBase64 } } },
      context: { name: contextName }
    } = this.sutPropertiesSubSet;

    this.log.info(`The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, { tags: [this.#fileName, methodName] });

    await this.setContextIdForSut(contextName);

    await this.#importDefinitionFromFileContent({ importFileContentBase64 });
  }
}

export default ImportUrls;

