Documentation around the _Job_ file structure can be found at https://docs.guardrails.io/docs/category/job-file

Examples of _Job_ files can be found at https://github.com/guardrailsio/runtime-resources/tree/main/jobs

* advanced-BrowserApp-job-example: This _Job_ file targets the [NodeGoat](https://github.com/OWASP/NodeGoat) SUT, which we host using [purpleteam-iac-sut](https://github.com/purpleteam-labs/purpleteam-iac-sut). You can use this _Job_ file and just update the `sutHost` to point to your hosted copy of NodeGoat as well as the `username` and `password` properties. If you are curious as to what the varius strategies do, you can read through their source code. For example the `sutAuthentication: { sitesTreeSutAuthenticationPopulationStrategy: FormStandard } can be found [here](https://github.com/guardrailsio/runtime-resources/blob/main/sUtAndEmissaryStrategies/1_sitesTreeSutAuthenticationPopulation/formStandard.js)
* simple-BrowserApp-job-example: This _Job_ file is good for most browser applications that don't require authentication. If using this _Job_ file, you will need to provide a valid `sutHost` property value. As it is, it will inform the application testing engine to scan the specified host from the root. If you want to be more specific, you can add routes to be scanned

