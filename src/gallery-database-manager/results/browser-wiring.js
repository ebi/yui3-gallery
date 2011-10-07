(function (B) {
    // TODO: add stuff here that makes the tests run.
    var contexts = [];
    B.addTestContext = function (context) { contexts.push(context); };
    B.testCase.onCreate = B.addTestContext;
    B.spec.describe.onCreate = B.addTestContext;

    function run() {
        var runner = B.testRunner.create();
        var reporter = B.reporters.html.create({root: document.body});
        reporter.listen(runner);

        buster.assertions.throwOnFailure = false;
        runner.runSuite(contexts);
    }

    if (window.addEventListener) {
        window.addEventListener("load", run, false);
    } else if (window.attachEvent) {
        window.attachEvent("onload", run);
    }
}(buster));