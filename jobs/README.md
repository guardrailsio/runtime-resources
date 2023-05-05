Documentation around the _Job_ file structure can be found at https://docs.guardrails.io/docs/category/job-file

Examples of _Job_ files can be found at https://github.com/guardrailsio/runtime-resources/tree/main/jobs

* advanced-BrowserApp-job-example: This _Job_ file targets the [NodeGoat](https://github.com/OWASP/NodeGoat) SUT, which we host using [purpleteam-iac-sut](https://github.com/purpleteam-labs/purpleteam-iac-sut). You can use this _Job_ file and just update the `sutHost` to point to your hosted copy of NodeGoat as well as the `username` and `password` properties
* simple-BrowserApp-job-example: This _Job_ file is good for most browser applications that don't require authentication. If using this _Job_ file, you will need to provide a valid `sutHost` property value. As it is, it will inform the _Application Testing Engine_ to scan the specified host from the root. If you want to be more specific, you can add routes to be scanned
* simple-BrowserApp-job-fast-example: This _Job_ file extends simple-BrowserApp-job-example by adding a single route, this will inform the _Application Testing Engine_ to only scan the specified route of the specified host. You will need to provide a valid `sutHost` property value, and a valid `route.id` property value. By using this _Job_, the [_Test Run_](https://docs.guardrails.io/docs/glossary#test-run) should be faster because it is not scanning from the root

