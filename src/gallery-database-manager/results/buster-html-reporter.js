buster.reporters = buster.reporters || {};

buster.reporters.html = (function () {
    function pluralize(num, phrase) {
        num = typeof num == "undefined" ? 0 : num;
        return num + " " + (num == 1 ? phrase : phrase + "s");
    }

    function createElement(tagName, properties) {
        var el = document.createElement(tagName), value;

        for (var prop in properties) {
            value = properties[prop];

            if (prop == "text") {
                prop = "innerHTML";
            }

            el[prop] = value;
        }

        return el;
    }

    function addListItem(tagName, test, className) {
        var prefix = tagName ? "<" + tagName + ">" : "";
        var suffix = tagName ? "</" + tagName + ">" : "";
        var name = this.contexts.slice(1).join(" ") + " " + test.name;

        var item = createElement("li", {
            className: className,
            text: prefix + name.replace(/^\s+|\s+$/, "") + suffix
        });

        this.list().appendChild(item);
        return item;
    }

    function addException(li, error) {
        if (!error) {
            return;
        }

        var name = error.name == "AssertionError" ? "" : error.name + ": ";

        li.appendChild(createElement("p", {
            innerHTML: name + error.message,
            className: "error-message"
        }));

        var stack = buster.stackFilter(error.stack) || [];

        if (stack.length > 0) {
            if (stack[0].indexOf(error.message) >= 0) {
                stack.shift();
            }

            li.appendChild(createElement("ul", {
                className: "stack",
                innerHTML: "<li>" + stack.join("</li><li>") + "</li>"
            }));
        }
    }

    function busterTestPath() {
        var scripts = document.getElementsByTagName("script");

        for (var i = 0, l = scripts.length; i < l; ++i) {
            if (/buster-test\.js$/.test(scripts[i].src)) {
                return scripts[i].src.replace("buster-test.js", "");
            }
        }

        return "";
    }

    return {
        create: function (opt) {
            if (!opt || !opt.root) {
                throw new TypeError("Need root element");
            }

            var reporter = buster.create(this);
            reporter.contexts = [];
            reporter.setRoot(opt.root);

            return reporter;
        },

        setRoot: function (root) {
            this.root = root;
            this.root.className += " buster-test";
            var body = document.body;

            if (this.root == body) {
                var head = document.getElementsByTagName("head")[0];
                head.parentNode.className += " buster-test";

                head.appendChild(createElement("meta", {
                    "name": "viewport",
                    "content": "width=device-width, initial-scale=1.0"
                }));

                head.appendChild(createElement("link", {
                    "rel": "stylesheet",
                    "type": "text/css",
                    "media": "all",
                    "href": busterTestPath() + "buster-test.css"
                }));

                if (document.getElementsByTagName("h1").length == 0) {
                    body.insertBefore(createElement("h1", {
                        "innerHTML": document.title || "Buster.JS Test case"
                    }), body.firstChild);
                }
            }
        },

        listen: function (runner) {
            runner.bind(this, {
                "context:start": "contextStart", "context:end": "contextEnd",
                "test:success": "testSuccess", "test:failure": "testFailure",
                "test:error": "testError", "test:timeout": "testTimeout",
                "test:deferred": "testDeferred", "suite:end": "addStats"
            });

            if (runner.console) {
                runner.console.bind(this, "log");
            }

            return this;
        },

        contextStart: function (context) {
            if (this.contexts.length == 0) {
                this.root.appendChild(createElement("h2", { text: context.name }));
            }

            this.startedAt = new Date();
            this.contexts.push(context.name);
        },

        contextEnd: function (context) {
            this.contexts.pop();
            this._list = null;
        },

        testSuccess: function (test) {
            var li = addListItem.call(this, "h3", test, "success");
            this.addMessages(li);
        },

        testFailure: function (test) {
            var li = addListItem.call(this, "h3", test, "failure");
            this.addMessages(li);
            addException(li, test.error);
        },

        testError: function (test) {
            var li = addListItem.call(this, "h3", test, "error");
            this.addMessages(li);
            addException(li, test.error);
        },

        testDeferred: function (test) {
            var li = addListItem.call(this, "h3", test, "deferred");
        },

        testTimeout: function (test) {
            var li = addListItem.call(this, "h3", test, "timeout");
            this.addMessages(li);
        },

        log: function (msg) {
            this.messages = this.messages || [];
            this.messages.push(msg);
        },

        addMessages: function (li) {
            var messages = this.messages || [];
            var html = "";

            if (messages.length == 0) {
                return;
            }

            for (var i = 0, l = messages.length; i < l; ++i) {
                html += "<li class=\"" + messages[i].level + "\">";
                html += messages[i].message + "</li>";
            }

            li.appendChild(createElement("ul", {
                className: "messages",
                innerHTML: html
            }));

            this.messages = [];
        },

        success: function (stats) {
            return stats.failures == 0 && stats.errors == 0 &&
                stats.tests > 0 && stats.assertions > 0;
        },

        addStats: function (stats) {
            var diff = (new Date() - this.startedAt) / 1000;
            var statsEl = createElement("div", { className: "stats" });
            this.root.appendChild(statsEl);

            statsEl.appendChild(createElement("h2", {
                text: this.success(stats) ? "Tests OK" : "Test failures!"
            }));

            var html = "";
            html += "<li>" + pluralize(stats.contexts, "test case") + "</li>";
            html += "<li>" + pluralize(stats.tests, "test") + "</li>";
            html += "<li>" + pluralize(stats.assertions, "assertion") + "</li>";
            html += "<li>" + pluralize(stats.failures, "failure") + "</li>";
            html += "<li>" + pluralize(stats.errors, "error") + "</li>";
            html += "<li>" + pluralize(stats.timeouts, "timeout") + "</li>";

            if (stats.deferred > 0) {
                html += "<li>" + stats.deferred + " deferred</li>";
            }

            statsEl.appendChild(createElement("ul", { innerHTML: html }));
            statsEl.appendChild(createElement("p", {
                className: "time",
                innerHTML: "Finished in " + diff + "s"
            }));
        },

        list: function () {
            if (!this._list) {
                this._list = createElement("ul", { className: "test-results" });
                this.root.appendChild(this._list);
            }

            return this._list;
        }
    };
}());
