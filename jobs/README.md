Documentation around the _Job_ file structure can be found at https://docs.guardrails.io/docs/category/job-file

Examples of _Job_ files can be found at https://github.com/guardrailsio/runtime-resources/tree/main/jobs

* **advanced-BrowserApp-job-example**: This _Job_ file targets the [NodeGoat](https://github.com/OWASP/NodeGoat) SUT, which we host using [purpleteam-iac-sut](https://github.com/purpleteam-labs/purpleteam-iac-sut). You can use this _Job_ file and just update the `sutHost` to point to your hosted copy of NodeGoat as well as the `username` and `passwordBase64` properties
* **job_crAPI-example**: This _Job_ file targets the [crAPI](https://github.com/OWASP/crAPI) SUT, which our devops team hosts for us. If using this _Job_ file, you will need to provide a valid `sutHost` property value. The `username` and `passwordBase64` properties will need updating with the values you entered when you created your user in a hosted copy of the crAPI project. The `openApi.importFileContentBase64` value will need to be updated
* **simple-BrowserApp-job-example**: This _Job_ file is good for most browser applications that don't require authentication. If using this _Job_ file, you will need to provide a valid `sutHost` property value. As it is, it will inform the _Application Testing Engine_ to scan the specified host from the root. If you want to be more specific, you can add routes to be scanned
* **simple-BrowserApp-job-fast-example**: This _Job_ file extends simple-BrowserApp-job-example by adding a single route, this will inform the _Application Testing Engine_ to only scan the specified route of the specified host. You will need to provide a valid `sutHost` property value, and a valid `route.id` property value. By using this _Job_, the [_Test Run_](https://docs.guardrails.io/docs/glossary#test-run) should be faster because it is not scanning from the root

If you are using a forwarding proxy, between the engine and your SUT, configure the `forwardingProxy` object properties with valid values. If you are not using a fowarding proxy, just remove the `forwardingProxy` object

