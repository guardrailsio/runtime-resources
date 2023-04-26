// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

import { promises as fsPromises } from 'fs';
import Reporting from './strategy.js';
import { NowAsFileName } from '../../strings/index.js';

class Standard extends Reporting {
  #baseUrl;
  #sutPropertiesSubSet;
  #emissaryPropertiesSubSet;
  #fileName = 'standard';
  #reportPrefix = 'report_';

  constructor({ log, baseUrl, sutPropertiesSubSet, emissaryPropertiesSubSet, zAp }) {
    super({ log, zAp });
    this.#baseUrl = baseUrl;
    this.#sutPropertiesSubSet = sutPropertiesSubSet;
    this.#emissaryPropertiesSubSet = emissaryPropertiesSubSet;
  }

  async #deleteLeftoverReportsAndSupportDirsIfExistFromPreviousTestRuns() {
    const methodName = '#deleteLeftoverReportsAndSupportDirsIfExistFromPreviousTestRuns';
    const { testSession: { id: testSessionId } } = this.#sutPropertiesSubSet;
    const { resultsDir } = this.#emissaryPropertiesSubSet;
    const fileAndDirNames = await fsPromises.readdir(resultsDir);
    const reportFileAndDirNames = fileAndDirNames.filter((f) => f.startsWith(`${this.#reportPrefix}appScannerId-`)); // Delete all appScanner reports.
    // Cron job defined in userData.tpl sets ownership on everything in this dir so that this process running as user app_scanner is able to delete old files.
    await Promise.all(reportFileAndDirNames.map(async (r) => fsPromises.rm(`${resultsDir}${r}`, { recursive: true })))
      .then(() => {
        const adminSuccessText = `Attempt to delete TestSession specific ("${testSessionId}") files and dirs from directory: "${resultsDir}" ✔ succeeded ✔.`;
        this.log.info(adminSuccessText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
      })
      .catch((err) => {
        const adminErrorText = `Attempt to delete TestSession specific ("${testSessionId}") files and dirs from directory: "${resultsDir}" ✖ failed ✖. This is probably because the machine instance's cron job to set write permissions has not yet run for these files, Error was: ${err.message}`;
        this.log.notice(adminErrorText, { tags: [`pid-${process.pid}`, this.#fileName, methodName] });
      });
  }

  // 1. App Tester attempts to delete previous reports of same TestSession from resultsDir
  // 2. Zap saves reports to resultsDir
  async createReports() {
    const methodName = 'createReports';
    const {
      testSession: { id: testSessionId, attributes: testSessionAttributes },
      context: { name: contextName }
    } = this.#sutPropertiesSubSet;

    const { resultsDir: reportDir } = this.#emissaryPropertiesSubSet;

    const nowAsFileName = NowAsFileName();

    const reportMetaData = [/* Used to be many others here, See PurpleTeam */{
      name: 'traditionalJson',
      generation: {
        title: 'PurpleTeam AppScan Report',
        template: 'traditional-json',
        theme: '', // N/A
        description: 'Purple teaming with PurpleTeam',
        contexts: contextName,
        sites: this.#baseUrl,
        sections: '', // All
        includedConfidences: 'Low|Medium|High|Confirmed',
        includedRisks: 'Informational|Low|Medium|High',
        reportFileName: `${this.#reportPrefix}appScannerId-${testSessionId}_traditional_${nowAsFileName}.json`,
        reportFileNamePattern: '',
        display: false,
        reportDir
      }
    }];

    this.log.info(`The ${methodName}() method of the ${super.constructor.name} strategy "${this.constructor.name}" has been invoked.`, { tags: [this.#fileName, methodName] });

    await this.#deleteLeftoverReportsAndSupportDirsIfExistFromPreviousTestRuns();

    const { reports } = { ...testSessionAttributes };
    // If reports, then Build User decided to specify a sub-set of report types rather than all report types.
    const chosenReportTemplateThemeNames = reports ? reports.templateThemes.map((rTT) => rTT.name) : reportMetaData.map((r) => r.name);

    const chosenReportMetaData = reportMetaData.filter((rMD) => chosenReportTemplateThemeNames.includes(rMD.name));

    // Run sequentially as we've had trouble with Zap handling parallel calls in other places.
    await chosenReportMetaData.reduce(async (accum, cV) => {
      await accum;
      const { generation: args } = cV;
      await this.zAp.aPi.reports.generate(args)
        .then(() => {
          this.log.info(`Done generating report: ${args.reportFileName}.`, { tags: [this.#fileName, methodName] });
        })
        .catch((err) => {
          const errorText = `Error occurred while attempting to generate report: "${args.reportFileName}", for Test Session with id: "${testSessionId}". Error was: ${err.message}.`;
          this.log.error(errorText, { tags: [this.#fileName, methodName] });
          throw new Error(errorText);
        });
    }, {});
  }
}

export default Standard;
