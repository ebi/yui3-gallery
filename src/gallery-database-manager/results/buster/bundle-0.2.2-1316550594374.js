var buster = (function (buster, setTimeout) {
    var toString = Object.prototype.toString;
    var div = typeof document != "undefined" && document.createElement("div");
    var setTimeout = setTimeout;

    function extend(target) {
        if (!target) {
            return;
        }

        for (var i = 1, l = arguments.length, prop; i < l; ++i) {
            for (prop in arguments[i]) {
                target[prop] = arguments[i][prop];
            }
        }

        return target;
    }

    if (typeof require == "function" && typeof module == "object") {
        var path = require("path");
        var fs = require("fs");

        buster.defineVersionGetter = function(mod, dirname) {
            Object.defineProperty(mod, "VERSION", {
                get: function () {
                    if (!this.version) {
                        var pkgJSON = path.resolve(dirname, "..", "package.json");
                        var pkg = JSON.parse(fs.readFileSync(pkgJSON, "utf8"));
                        this.version = pkg.version;
                    }

                    return this.version;
                }
            });
        };
    }

    return extend(buster, {
        setTimeout: function (callback, timeout) {
            setTimeout(callback, timeout);
        },

        isNode: function (obj) {
            if (!div) {
                return false;
            }

            try {
                obj.appendChild(div);
                obj.removeChild(div);
            } catch (e) {
                return false;
            }

            return true;
        },

        isElement: function (obj) {
            return obj && this.isNode(obj) && obj.nodeType === 1;
        },

        bind: function (obj, methOrProp) {
            var method = typeof methOrProp == "string" ? obj[methOrProp] : methOrProp;
            var args = Array.prototype.slice.call(arguments, 2);

            return function () {
                var allArgs = args.concat(Array.prototype.slice.call(arguments));
                return method.apply(obj, allArgs);
            };
        },

        isArguments: function (obj) {
            if (typeof obj != "object" || typeof obj.length != "number" ||
                toString.call(obj) == "[object Array]") {
                return false;
            }

            if (typeof obj.callee == "function") {
                return true;
            }

            try {
                obj[obj.length] = 6;
                delete obj[obj.length];
            } catch (e) {
                return true;
            }

            return false;
        },

        keys: (function () {
            if (Object.keys) {
                return function (obj) {
                    return Object.keys(obj)
                };
            }

            return function (object) {
                var keys = [];

                for (var prop in object) {
                    if (Object.prototype.hasOwnProperty.call(object, prop)) {
                        keys.push(prop);
                    }
                }

                return keys;
            }
        }()),

        create: (function () {
            function F() {}

            return function create(object) {
                F.prototype = object;
                return new F();
            }
        }()),

        extend: extend,

        customError: function (name, superError) {
            superError = superError || Error;

            var error = function (msg) {
                this.message = msg;
            };

            error.prototype = this.create(superError.prototype);
            error.prototype.type = name;

            return error;
        },

        nextTick: function (callback) {
            if (typeof process != "undefined" && process.nextTick) {
                return process.nextTick(callback);
            }

            buster.setTimeout(callback, 0);
        },

        functionName: function (func) {
            if (!func) return "";
            if (func.displayName) return func.displayName;
            if (func.name) return func.name;

            var matches = func.toString().match(/function\s+([^\(]+)/m);
            return matches && matches[1] || "";
        }
    });
}(buster || {}, setTimeout));

if (typeof module == "object" && typeof require == "function") {
    buster.require = function (module) {
        buster.extend(buster, require("buster-" + module));
    };

    module.exports = buster;
    buster.eventEmitter = require("./buster-event-emitter");
}
/*jslint eqeqeq: false, onevar: false, plusplus: false*/
/*global buster, require, module*/
if (typeof buster == "undefined" && typeof require == "function") {
    var buster = require("./buster-core");
}

(function () {
    function eventListeners(eventEmitter, event) {
        if (!eventEmitter.listeners) {
            eventEmitter.listeners = {};
        }

        if (!eventEmitter.listeners[event]) {
            eventEmitter.listeners[event] = [];
        }

        return eventEmitter.listeners[event];
    }

    function thisObjects(eventEmitter, event) {
        if (!eventEmitter.contexts) {
            eventEmitter.contexts = {};
        }

        if (!eventEmitter.contexts[event]) {
            eventEmitter.contexts[event] = [];
        }

        return eventEmitter.contexts[event];
    }

    function throwLater(event, error) {
        buster.nextTick(function () {
            error.message = event + " listener threw error: " + error.message;
            throw error;
        });
    }

    buster.eventEmitter = {
        create: function () {
            return buster.create(this);
        },

        addListener: function addListener(event, listener, thisObject) {
            if (typeof listener != "function") {
                throw new TypeError("Listener is not function");
            }

            eventListeners(this, event).push(listener);
            thisObjects(this, event).push(thisObject);
        },

        hasListener: function hasListener(event, listener, thisObject) {
            var listeners = eventListeners(this, event);
            var contexts = thisObjects(this, event);

            for (var i = 0, l = listeners.length; i < l; i++) {
                if (listeners[i] == listener && contexts[i] === thisObject) {
                    return true;
                }
            }

            return false;
        },

        removeListener: function (event, listener) {
            var listeners = eventListeners(this, event);

            for (var i = 0, l = listeners.length; i < l; ++i) {
                if (listeners[i] == listener) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        },

        emit: function emit(event) {
            var listeners = eventListeners(this, event);
            var contexts = thisObjects(this, event);
            var args = Array.prototype.slice.call(arguments, 1);

            for (var i = 0, l = listeners.length; i < l; i++) {
                try {
                    listeners[i].apply(contexts[i] || this, args);
                } catch (e) {
                    throwLater(event, e);
                }
            }
        },

        bind: function (object, events) {
            var method;

            if (!events) {
                for (method in object) {
                    if (object.hasOwnProperty(method) && typeof object[method] == "function") {
                        this.addListener(method, object[method], object);
                    }
                }
            } else if (typeof events == "string" ||
                       Object.prototype.toString.call(events) == "[object Array]") {
                events = typeof events == "string" ? [events] : events;

                for (var i = 0, l = events.length; i < l; ++i) {
                    this.addListener(events[i], object[events[i]], object);
                }
            } else {
                for (var prop in events) {
                    if (events.hasOwnProperty(prop)) {
                        method = events[prop];

                        if (typeof method == "function") {
                            object[buster.functionName(method) || prop] = method;
                        } else {
                            method = object[events[prop]];
                        }

                        this.addListener(prop, method, object);
                    }
                }
            }

            return object;
        }
    };

    buster.eventEmitter.on = buster.eventEmitter.addListener;
}());

if (typeof module != "undefined") {
    module.exports = buster.eventEmitter;
}
var buster = buster || {};

if (typeof require != "undefined") {
    buster = require("buster-core");
}

(function () {
    function indexOf(array, item) {
        if (array.indexOf) {
            return array.indexOf(item);
        }

        for (var i = 0, l = array.length; i < l; ++i) {
            if (array[i] == item) {
                return i;
            }
        }

        return -1;
    }

    function createLogger(name, level) {
        return function () {
            if (level > indexOf(this.levels, this.level)) {
                return;
            }

            var message = [];

            for (var i = 0, l = arguments.length; i < l; ++i) {
                message.push(this.format(arguments[i]));
            }

            this.emit("log", {
                message: message.join(" "),
                level: this.levels[level]
            });
        };
    }

    buster.eventedLogger = buster.extend(buster.create(buster.eventEmitter), {
        create: function (opt) {
            opt = opt || {};
            var logger = buster.create(this);
            logger.levels = opt.levels || ["error", "warn", "log", "debug"];
            logger.level = opt.level || logger.levels[logger.levels.length - 1];

            for (var i = 0, l = logger.levels.length; i < l; ++i) {
                logger[logger.levels[i]] = createLogger(logger.levels[i], i);
            }

            if (opt.formatter) {
                logger.format = opt.formatter;
            }

            return logger;
        },

        format: function (obj) {
            if (typeof obj != "object") {
                return "" + obj;
            }

            try {
                return JSON.stringify(obj);
            } catch (e) {
                return "" + obj;
            }
        }
    });
}());

if (typeof module != "undefined") {
    module.exports = buster.eventedLogger;
}
/*jslint eqeqeq: false, onevar: false, plusplus: false*/
/*global buster, require, module*/
if (typeof require == "function") {
    var buster = require("buster-core");
}

(function () {
    var slice = Array.prototype.slice;
    var toString = Object.prototype.toString;
    var assert, refute;

    function indexOf(arr, item) {
        for (var i = 0, l = arr.length; i < l; i++) {
            if (arr[i] == item) {
                return i;
            }
        }

        return -1;
    }

    var ba = buster.assertions = buster.eventEmitter.create();

    if (typeof module == "object") {
        module.exports = buster.assertions;
    }

    function prepareAssertion(name, args, num) {
        if (typeof ba.count != "number") {
            ba.count = 0;
        }

        ba.count += 1;

        if (args.length < num) {
            ba.fail("[" + name + "] Expected to receive at least " +
                        num + " argument" + (num > 1 ? "s" : ""));

            return null;
        }

        if (args.length >= num + 1) {
            var msg = args[num];

            if (typeof msg == "string") {
                msg += !/[\?\!\.\:\;\,]$/.test(msg) ? ": " : " ";
            }

            return msg;
        }

        return "";
    }

    function fail(type, assertion, msg) {
        msg = ba[type][assertion][msg];

        for (var i = 3, l = arguments.length; i < l; i++) {
            if (i == 3) {
                msg = msg.replace("${" + (i-3) + "}", arguments[i]);
            } else {
                msg = msg.replace("${" + (i-3) + "}", ba.format(arguments[i]));
            }
        }

        ba.fail("[" + type + "." + assertion + "] " + msg);
    }

    function isDate(value) {
        // Duck typed dates, allows objects to take on the role of dates
        // without actually being dates
        return typeof value.getTime == "function" &&
            value.getTime() == value.valueOf();
    }

    function areEqual(expected, actual) {
        if (expected === actual) {
            return true;
        }

        // Elements are only equal if expected === actual
        if (buster.isElement(expected) || buster.isElement(actual)) {
            return false;
        }

        // null and undefined only pass for null === null and
        // undefined === undefined
        /*jsl: ignore*/
        if (expected == null || actual == null) {
            return actual === expected;
        }
        /*jsl: end*/

        if (isDate(expected) || isDate(actual)) {
            return isDate(expected) && isDate(actual) &&
                expected.getTime() == actual.getTime();
        }

        var useCoercingEquality = typeof expected != "object" || typeof actual != "object";

        if (expected instanceof RegExp && actual instanceof RegExp) {
            if (expected.toString() != actual.toString()) {
                return false;
            }

            useCoercingEquality = false;
        }

        // Arrays can only be equal to arrays
        var expectedStr = toString.call(expected);
        var actualStr = toString.call(actual);

        // Coerce and compare when primitives are involved
        if (useCoercingEquality) {
            return expectedStr != "[object Array]" && actualStr != "[object Array]" &&
                expected == actual;
        }

        var expectedKeys = buster.keys(expected);
        var actualKeys = buster.keys(actual);

        if (buster.isArguments(expected) || buster.isArguments(actual)) {
            if (expected.length != actual.length) {
                return false;
            }
        } else {
            if (typeof expected != typeof actual || expectedStr != actualStr ||
                expectedKeys.length != actualKeys.length) {
                return false;
            }
        }

        var key;

        for (var i = 0, l = expectedKeys.length; i < l; i++) {
            key = expectedKeys[i];

            if (!Object.prototype.hasOwnProperty.call(actual, key) ||
                !areEqual(expected[key], actual[key])) {
                return false;
            }
        }

        return true;
    }

    assert = ba.assert = function (actual, message) {
        prepareAssertion("assert", arguments, 1);

        if (!actual) {
            var val = ba.format(actual)
            ba.fail(message || "[assert] Expected " + val + " to be truthy");
        } else {
            ba.emit("pass", "assert", message || "", actual);
        }
    };

    refute = ba.refute = function (actual, message) {
        prepareAssertion("refute", arguments, 1);

        if (actual) {
            var val = ba.format(actual)
            ba.fail(message || "[refute] Expected " + val + " to be falsy");
        } else {
            ba.emit("pass", "refute", message || "", actual);
        }
    };

    assert.msgFail = "[assert] Expected ${1} to be thruthy";
    ba.count = 0;

    ba.fail = function (message) {
        var exception = new Error(message);
        exception.name = "AssertionError";

        try {
            throw exception;
        } catch (e) {
            ba.emit("failure", e);
        }

        if (typeof ba.throwOnFailure != "boolean" || ba.throwOnFailure) {
            throw exception;
        }
    };

    ba.format = function (object) {
        return "" + object;
    };

    assert.isTrue = function (actual, message) {
        message = prepareAssertion("assert.isTrue", arguments, 1);

        if (message === null) {
            return;
        }

        if (actual !== true) {
            fail("assert", "isTrue", "msgFail", message, actual);
        } else {
            ba.emit("pass", "assert.isTrue", message, actual);
        }
    };

    assert.isTrue.msgFail = "${0}Expected ${1} to be true";

    assert.isFalse = function (actual, message) {
        message = prepareAssertion("assert.isFalse", arguments, 1);

        if (message === null) {
            return;
        }

        if (actual !== false) {
            fail("assert", "isFalse", "msgFail", message, actual);
        } else {
            ba.emit("pass", "assert.isFalse", message, actual);
        }
    };

    assert.isFalse.msgFail = "${0}Expected ${1} to be false";

    assert.same = function (actual, expected, message) {
        message = prepareAssertion("assert.same", arguments, 2);

        if (message === null) {
            return;
        }

        if (actual !== expected) {
            fail("assert", "same", "msgFail", message, actual, expected);
        } else {
            ba.emit("pass", "assert.same", message, actual, expected);
        }
    };

    assert.same.msgFail = "${0}Expected ${1} to be the same object as ${2}";

    refute.same = function (actual, expected, message) {
        message = prepareAssertion("refute.same", arguments, 2);

        if (message === null) {
            return;
        }

        if (actual === expected) {
            fail("refute", "same", "msgFail", message, actual, expected);
        } else {
            ba.emit("pass", "refute.same", message, actual, expected);
        }
    };

    refute.same.msgFail = "${0}Expected ${1} not to be the same object as ${2}";

    assert.equals = function (actual, expected, message) {
        message = prepareAssertion("assert.equals", arguments, 2);

        if (message === null) {
            return;
        }

        if (!areEqual(actual, expected)) {
            fail("assert", "equals", "msgFail", message, actual, expected);
        } else {
            ba.emit("pass", "assert.equals", message, actual, expected);
        }
    };

    assert.equals.msgFail = "${0}Expected ${1} to be equal to ${2}";

    refute.equals = function (actual, expected, message) {
        message = prepareAssertion("refute.equals", arguments, 2);

        if (message === null) {
            return;
        }

        if (areEqual(actual, expected)) {
            fail("refute", "equals", "msgFail", message, actual, expected);
        } else {
            ba.emit("pass", "refute.equals", message, actual, expected);
        }
    };

    refute.equals.msgFail = "${0}Expected ${1} not to be equal to ${2}";

    assert.typeOf = function (actual, expected, message) {
        message = prepareAssertion("assert.typeOf", arguments, 2);

        if (message === null) {
            return;
        }

        if (typeof actual != expected) {
            fail("assert", "typeOf", "msgFail", message, actual, expected, typeof actual);
        } else {
            ba.emit("pass", "assert.typeOf", message, actual, expected);
        }
    };

    assert.typeOf.msgFail = "${0}Expected typeof ${1} (${3}) to be ${2}";

    refute.typeOf = function (actual, expected, message) {
        message = prepareAssertion("refute.typeOf", arguments, 2);

        if (message === null) {
            return;
        }

        if (typeof actual == expected) {
            fail("refute", "typeOf", "msgFail", message, actual, expected);
        } else {
            ba.emit("pass", "refute.typeOf", message, actual, expected);
        }
    };

    refute.typeOf.msgFail = "${0}Expected typeof ${1} not to be ${2}";

    assert.isString = function (actual, message) {
        message = prepareAssertion("assert.isString", arguments, 1);

        if (message === null) {
            return;
        }

        if (typeof actual != "string") {
            fail("assert", "isString", "msgFail", message, actual, typeof actual);
        } else {
            ba.emit("pass", "assert.isString", message, actual);
        }
    };

    assert.isString.msgFail = "${0}Expected typeof ${1} (${2}) to be string";

    assert.isObject = function (actual, message) {
        message = prepareAssertion("assert.isObject", arguments, 1);

        if (message === null) {
            return;
        }

        if (typeof actual != "object" || !actual) {
            fail("assert", "isObject", "msgFail", message, actual, typeof actual);
        } else {
            ba.emit("pass", "assert.isObject", message, actual);
        }
    };

    assert.isObject.msgFail = "${0}Expected typeof ${1} (${2}) to be object and not null";

    assert.isFunction = function (actual, message) {
        message = prepareAssertion("assert.isFunction", arguments, 1);

        if (message === null) {
            return;
        }

        if (typeof actual != "function") {
            fail("assert", "isFunction", "msgFail", message, actual, typeof actual);
        } else {
            ba.emit("pass", "assert.isFunction", message, actual);
        }
    };

    assert.isFunction.msgFail = "${0}Expected typeof ${1} (${2}) to be function";

    assert.isBoolean = function (actual, message) {
        message = prepareAssertion("assert.isBoolean", arguments, 1);

        if (message === null) {
            return;
        }

        if (typeof actual != "boolean") {
            fail("assert", "isBoolean", "msgFail", message, actual, typeof actual);
        } else {
            ba.emit("pass", "assert.isBoolean", message, actual);
        }
    };

    assert.isBoolean.msgFail = "${0}Expected typeof ${1} (${2}) to be boolean";

    assert.isNumber = function (actual, message) {
        message = prepareAssertion("assert.isNumber", arguments, 1);

        if (message === null) {
            return;
        }

        if (typeof actual != "number" || isNaN(actual)) {
            fail("assert", "isNumber", "msgFail", message, actual, typeof actual);
        } else {
            ba.emit("pass", "assert.isNumber", message, actual);
        }
    };

    assert.isNumber.msgFail = "${0}Expected ${1} (${2}) to be a non-NaN number";

    assert.isUndefined = function (actual, message) {
        message = prepareAssertion("assert.isUndefined", arguments, 1);

        if (message === null) {
            return;
        }

        if (typeof actual != "undefined") {
            fail("assert", "isUndefined", "msgFail", message, actual, typeof actual);
        } else {
            ba.emit("pass", "assert.isUndefined", message, actual);
        }
    };

    assert.isUndefined.msgFail = "${0}Expected typeof ${1} (${2}) to be undefined";

    refute.isUndefined = function (actual, message) {
        message = prepareAssertion("refute.isUndefined", arguments, 1);

        if (message === null) {
            return;
        }

        if (typeof actual == "undefined") {
            fail("refute", "isUndefined", "msgFail", message, actual);
        } else {
            ba.emit("pass", "refute.isUndefined", message, actual);
        }
    };

    refute.isUndefined.msgFail = "${0}Expected not to be undefined";

    assert.isNull = function (actual, message) {
        message = prepareAssertion("assert.isNull", arguments, 1);

        if (message === null) {
            return;
        }

        if (actual !== null) {
            fail("assert", "isNull", "msgFail", message, actual);
        } else {
            ba.emit("pass", "assert.isNull", message, actual);
        }
    };

    assert.isNull.msgFail = "${0}Expected ${1} to be null";

    refute.isNull = function (actual, message) {
        message = prepareAssertion("refute.isNull", arguments, 1);

        if (message === null) {
            return;
        }

        if (actual === null) {
            fail("refute", "isNull", "msgFail", message);
        } else {
            ba.emit("pass", "refute.isNull", message);
        }
    };

    refute.isNull.msgFail = "${0}Expected not to be null";

    assert.isNaN = function (actual, message) {
        message = prepareAssertion("assert.isNaN", arguments, 1);

        if (message === null) {
            return;
        }

        if (typeof actual != "number" || !isNaN(actual)) {
            fail("assert", "isNaN", "msgFail", message, actual);
        } else {
            ba.emit("pass", "assert.isNaN", message, actual);
        }
    };

    assert.isNaN.msgFail = "${0}Expected ${1} to be NaN";

    refute.isNaN = function (actual, message) {
        message = prepareAssertion("refute.isNaN", arguments, 1);

        if (message === null) {
            return;
        }

        if (typeof actual == "number" && isNaN(actual)) {
            fail("refute", "isNaN", "msgFail", message, actual);
        } else {
            ba.emit("pass", "refute.isNaN", message, actual);
        }
    };

    refute.isNaN.msgFail = "${0}Expected not to be NaN";

    assert.isArray = function (actual, message) {
        message = prepareAssertion("assert.isArray", arguments, 1);

        if (message === null) {
            return;
        }

        if (toString.call(actual) != "[object Array]") {
            fail("assert", "isArray", "msgFail", message, actual);
        } else {
            ba.emit("pass", "assert.isArray", message, actual);
        }
    };

    assert.isArray.msgFail = "${0}Expected ${1} to be array";

    refute.isArray = function (actual, message) {
        message = prepareAssertion("refute.isArray", arguments, 1);

        if (message === null) {
            return;
        }

        if (toString.call(actual) == "[object Array]") {
            fail("refute", "isArray", "msgFail", message, actual);
        } else {
            ba.emit("pass", "refute.isArray", message, actual);
        }
    };

    refute.isArray.msgFail = "${0}Expected ${1} not to be array";

    function isArrayLike(object) {
        return toString.call(object) == "[object Array]" ||
            (!!object && typeof object.length == "number" &&
            typeof object.splice == "function") ||
            buster.isArguments(object);
    }

    assert.isArrayLike = function (actual, message) {
        message = prepareAssertion("assert.isArrayLike", arguments, 1);

        if (message === null) {
            return;
        }

        if (!isArrayLike(actual)) {
            fail("assert", "isArrayLike", "msgFail", message, actual);
        } else {
            ba.emit("pass", "assert.isArrayLike", message, actual);
        }
    };

    assert.isArrayLike.msgFail = "${0}Expected ${1} to be array like";

    refute.isArrayLike = function (actual, message) {
        message = prepareAssertion("refute.isArrayLike", arguments, 1);

        if (message === null) {
            return;
        }

        if (isArrayLike(actual)) {
            fail("refute", "isArrayLike", "msgFail", message, actual);
        } else {
            ba.emit("pass", "refute.isArrayLike", message, actual);
        }
    };

    refute.isArrayLike.msgFail = "${0}Expected ${1} not to be array like";

    function match(object, matcher) {
        if (matcher && typeof matcher.test == "function") {
            return matcher.test(object);
        }

        if (typeof matcher == "function") {
            return matcher(object) === true;
        }

        if (typeof matcher == "string") {
            matcher = matcher.toLowerCase();
            return !!object && ("" + object).toLowerCase().indexOf(matcher) >= 0;
        }

        if (typeof matcher == "number") {
            return matcher == object;
        }

        if (typeof matcher == "boolean") {
            return matcher === object;
        }

        if (matcher && typeof matcher == "object") {
            for (var prop in matcher) {
                if (!match(object[prop], matcher[prop])) {
                    return false;
                }
            }

            return true;
        }

        throw new Error("Matcher (" + ba.format(matcher) + ") was not a " +
                        "string, a number, a function, a boolean or an object");
    }

    assert.match = function (actual, matcher, message) {
        message = prepareAssertion("assert.match", arguments, 2);
        var passed;

        if (message === null) {
            return;
        }

        try {
            passed = match(actual, matcher);
        } catch (e) {
            return fail("assert", "match", "msgException", message, e.message);
        }

        if (!passed) {
            return fail("assert", "match", "msgFail", message, actual, matcher);
        }

        ba.emit("pass", "assert.match", message, actual, matcher);
    };

    assert.match.msgException = "${0}${1}";
    assert.match.msgFail = "${0}Expected ${1} to match ${2}";

    refute.match = function (actual, matcher, message) {
        message = prepareAssertion("refute.match", arguments, 2);
        var passed;

        if (message === null) {
            return;
        }

        try {
            passed = match(actual, matcher);
        } catch (e) {
            return fail("refute", "match", "msgException", message, e.message);
        }

        if (passed) {
            return fail("refute", "match", "msgFail", message, matcher, actual);
        }

        ba.emit("pass", "refute.match", message, matcher, actual);
    };

    refute.match.msgException = "${0}${1}";
    refute.match.msgFail = "${0}Expected ${2} not to match ${1}";

    function captureException(callback) {
        try {
            callback();
        } catch (e) {
            return e;
        }

        return null;
    }

    assert.exception = function (callback, exception, message) {
        prepareAssertion("assert.exception", arguments, 1);

        if (!callback) {
            return;
        }

        var err = captureException(callback);
        message = message ? message + ": " : "";

        if (!err) {
            if (exception) {
                return fail("assert", "exception", "msgTypeNoException", message, exception);
            } else {
                return fail("assert", "exception", "msgFail", message, exception);
            }
        }

        if (exception && err.name != exception) {
            return fail("assert", "exception", "msgTypeFail", message, exception, err.name, err.message);
        }

        ba.emit("pass", "assert.exception", message, callback, exception);
    };

    assert.exception.msgTypeNoException = "${0}Expected ${1} but no exception was thrown";
    assert.exception.msgFail = "${0}Expected exception";
    assert.exception.msgTypeFail = "${0}Expected ${1} but threw ${2} (${3})";

    refute.exception = function (callback, message) {
        message = prepareAssertion("refute.exception", arguments, 1);

        if (message === null) {
            return;
        }

        var err = captureException(callback);

        if (err) {
            fail("refute", "exception", "msgFail", message, err.name, err.message, callback);
        } else {
            ba.emit("pass", "refute.exception", message, callback);
        }
    };

    refute.exception.msgFail = "${0}Expected not to throw but threw ${1} (${2})";

    assert.tagName = function (element, tagName, message) {
        message = prepareAssertion("assert.tagName", arguments, 2);

        if (message === null) {
            return;
        }

        if (!element.tagName) {
            return fail("assert", "tagName", "msgNoTagName", message, tagName, element);
        }

        if (!tagName.toLowerCase ||
            tagName.toLowerCase() != element.tagName.toLowerCase()) {
            return fail("assert", "tagName", "msgFail", message, tagName, element.tagName);
        }

        ba.emit("pass", "assert.tagName", message, tagName, element);
    };

    assert.tagName.msgNoTagName = "${0}Expected ${2} to have tagName property";
    assert.tagName.msgFail = "${0}Expected tagName to be ${1} but was ${2}";

    refute.tagName = function (element, tagName, message) {
        message = prepareAssertion("refute.tagName", arguments, 2);

        if (message === null) {
            return;
        }

        if (!element.tagName) {
            return fail("refute", "tagName", "msgNoTagName", message, tagName, element);
        }

        if (tagName.toLowerCase &&
            tagName.toLowerCase() == element.tagName.toLowerCase()) {
            return fail("refute", "tagName", "msgFail", message, tagName);
        }

        ba.emit("pass", "refute.tagName", message, tagName, element);
    };

    refute.tagName.msgNoTagName = "${0}Expected ${2} to have tagName property";
    refute.tagName.msgFail = "${0}Expected tagName not to be ${1}";

    assert.className = function (element, tagName, message) {
        message = prepareAssertion("assert.className", arguments, 2);

        if (message === null) {
            return;
        }

        if (typeof element.className == "undefined") {
            return fail("assert", "className", "msgNoClassName", message, tagName, element);
        }

        var expected = typeof tagName == "string" ? tagName.split(" ") : tagName;
        var actual = element.className.split(" ");

        for (var i = 0, l = expected.length; i < l; i++) {
            if (indexOf(actual, expected[i]) < 0) {
                return fail("assert", "className", "msgFail", message, tagName, element.className);
            }
        }

        ba.emit("pass", "assert.className", message, tagName, element);
    };

    assert.className.msgNoClassName = "${0}Expected object to have className property";
    assert.className.msgFail = "${0}Expected object's className to include ${1} but was ${2}";

    refute.className = function (element, tagName, message) {
        message = prepareAssertion("refute.className", arguments, 2);

        if (message === null) {
            return;
        }

        if (typeof element.className == "undefined") {
            return fail("refute", "className", "msgNoClassName", message, tagName, element);
        }

        var expected = typeof tagName == "string" ? tagName.split(" ") : tagName;
        var actual = element.className.split(" ");

        for (var i = 0, l = expected.length; i < l; i++) {
            if (indexOf(actual, expected[i]) < 0) {
                return ba.emit("pass", "refute.className", message, tagName, element);
            }
        }

        fail("refute", "className", "msgFail", message, tagName, element.className);
    };

    refute.className.msgNoClassName = "${0}Expected object to have className property";
    refute.className.msgFail = "${0}Expected object's className not to include ${1}";

    assert.inDelta = function (actual, expected, delta, message) {
        message = prepareAssertion("assert.inDelta", arguments, 3);

        if (message === null) {
            return;
        }

        if (Math.abs(actual - expected) > delta) {
            return fail("assert", "inDelta", "msgFail", message, actual, expected, delta);
        }

        ba.emit("pass", "assert.inDelta", message, actual, expected, delta);
    };

    assert.inDelta.msgFail = "${0}Expected ${1} to be equal to ${2} +/- ${3}";

    refute.inDelta = function (actual, expected, delta, message) {
        message = prepareAssertion("refute.inDelta", arguments, 3);

        if (message === null) {
            return;
        }

        if (Math.abs(actual - expected) <= delta) {
            return fail("refute", "inDelta", "msgFail", message, actual, expected, delta);
        }

        ba.emit("pass", "refute.inDelta", message, actual, expected, delta);
    };

    refute.inDelta.msgFail = "${0}Expected ${1} not to be equal to ${2} +/- ${3}";

    if (typeof module != "undefined") {
        ba.assert.that = function () {
            ba.assert.that = require("./buster-assert/assert-that");
            return ba.assert.that.apply(exports, arguments);
        }
    }
}());
if (typeof module == "object" && typeof require == "function") {
    var buster = require("buster-core");
    buster.assertions = require("../buster-assertions");
}

buster.assertions.that = function (object) {
    object.that = function (actual) {
        var asserter = buster.create(object.that.asserter);
        asserter.actual = actual;

        return asserter;
    };

    object.that.asserter = {};

    function buildAssertion(assertion) {
        object.that.asserter[assertion] = function () {
            var args = [this.actual].concat(Array.prototype.slice.call(arguments));
            return object[assertion].apply(object, args);
        };
    }

    for (var prop in object) {
        if (typeof object[prop] != "function") {
            continue;
        }

        buildAssertion(prop);
    }
};

if (typeof module == "object") {
    module.exports = buster.assertions.that;
}
if (typeof module == "object" && typeof require == "function") {
    var buster = require("buster-core");
    buster.assertions = require("../buster-assertions");
    buster.assertions.that = require("./that");
}

buster.assertions.that(buster.assertions.assert);

if (typeof module == "object") {
    module.exports = buster.assertions.assert.that;
}
if (typeof module == "object" && typeof require == "function") {
    var buster = require("buster-core");
    buster.assertions = require("../buster-assertions");
    buster.assertions.that = require("./that");
}

buster.assertions.that(buster.assertions.refute);

if (typeof module == "object") {
    module.exports = buster.assertions.refute.that;
}
var buster = this.buster || {};

if (typeof require != "undefined") {
    buster = require("buster-core");
}

buster.format = buster.format || {};
buster.format.excludeConstructors = ["Object", /^.$/];
buster.format.quoteStrings = true;

buster.format.ascii = (function () {
    function keys(object) {
        var k = Object.keys && Object.keys(object) || [];

        if (k.length == 0) {
            for (var prop in object) {
                if (object.hasOwnProperty(prop)) {
                    k.push(prop);
                }
            }
        }

        return k.sort();
    }

    function isCircular(object, objects) {
        if (typeof object != "object") {
            return false;
        }

        for (var i = 0, l = objects.length; i < l; ++i) {
            if (objects[i] === object) {
                return true;
            }
        }

        return false;
    }

    function ascii(object, processed, indent) {
        if (typeof object == "string") {
            var quote = typeof this.quoteStrings != "boolean" || this.quoteStrings;
            return processed || quote ? '"' + object + '"' : object;
        }

        if (typeof object == "function" && !(object instanceof RegExp)) {
            return ascii.func(object);
        }

        processed = processed || [];

        if (isCircular(object, processed)) {
            return "[Circular]";
        }

        if (Object.prototype.toString.call(object) == "[object Array]") {
            return ascii.array(object);
        }

        if (!object) {
            return "" + object;
        }

        if (buster.isElement(object)) {
            return ascii.element(object);
        }

        if (object.toString !== Object.prototype.toString) {
            return object.toString();
        }

        return ascii.object.call(this, object, processed, indent);
    }

    ascii.func = function (func) {
        return "function " + buster.functionName(func) + "() {}";
    };

    ascii.array = function (array, processed) {
        processed = processed || [];
        processed.push(array);
        var pieces = [];

        for (var i = 0, l = array.length; i < l; ++i) {
            pieces.push(ascii(array[i], processed));
        }

        return "[" + pieces.join(", ") + "]";
    };

    ascii.object = function (object, processed, indent) {
        processed = processed || [];
        processed.push(object);
        indent = indent || 0;
        var pieces = [], properties = keys(object), prop, str, obj;
        var is = "";
        var length = 3;

        for (var i = 0, l = indent; i < l; ++i) {
            is += " ";
        }

        for (i = 0, l = properties.length; i < l; ++i) {
            prop = properties[i];
            obj = object[prop];

            if (isCircular(obj, processed)) {
                str = "[Circular]";
            } else {
                str = ascii.call(this, obj, processed, indent + 2);
            }

            str = (/\s/.test(prop) ? '"' + prop + '"' : prop) + ": " + str;
            length += str.length;
            pieces.push(str);
        }

        var cons = ascii.constructorName.call(this, object);
        var prefix = cons ? "[" + cons + "] " : ""

        return (length + indent) > 80 ?
            prefix + "{\n  " + is + pieces.join(",\n  " + is) + "\n" + is + "}" :
            prefix + "{ " + pieces.join(", ") + " }";
    };

    ascii.element = function (element) {
        var tagName = element.tagName.toLowerCase();
        var attrs = element.attributes, attribute, pairs = [], attrName;

        for (var i = 0, l = attrs.length; i < l; ++i) {
            attribute = attrs.item(i);
            attrName = attribute.nodeName.toLowerCase().replace("html:", "");

            if (attrName == "contenteditable" && attribute.nodeValue == "inherit") {
                continue;
            }

            if (!!attribute.nodeValue) {
                pairs.push(attrName + "=\"" + attribute.nodeValue + "\"");
            }
        }

        var formatted = "<" + tagName + (pairs.length > 0 ? " " : "");
        var content = element.innerHTML;

        if (content.length > 20) {
            content = content.substr(0, 20) + "[...]";
        }

        var res = formatted + pairs.join(" ") + ">" + content + "</" + tagName + ">";

        return res.replace(/ contentEditable="inherit"/, "");
    };

    ascii.constructorName = function (object) {
        var name = buster.functionName(object && object.constructor);
        var excludes = this.excludeConstructors || buster.format.excludeConstructors || [];

        for (var i = 0, l = excludes.length; i < l; ++i) {
            if (typeof excludes[i] == "string" && excludes[i] == name) {
                return "";
            } else if (excludes[i].test && excludes[i].test(name)) {
                return "";
            }
        }

        return name;
    };

    return ascii;
}());

if (typeof module != "undefined") {
    module.exports = buster.format;
}
var buster = buster || {};

if (typeof module != "undefined") {
    buster = require("buster-core");
}

(function () {
    var states = {
        unresolved: "unresolved",
        resolve: "resolve",
        reject: "reject"
    };

    function notify(listener) {
        if (typeof listener[this.state] == "function") {
            listener[this.state].apply(null, this.resolution);
        }
    }

    function fulfill(how, args) {
        if (this.state != states.unresolved) {
            throw new Error("Promise is already fulfilled");
        }

        this.state = states[how];
        var callbacks = this.callbacks || [];
        this.resolution = Array.prototype.slice.call(args);

        for (var i = 0, l = callbacks.length; i < l; ++i) {
            notify.call(this, callbacks[i]);
        }

        return this;
    }

    var id = 0;

    buster.promise = {
        state: states.unresolved,

        create: function (func) {
            var promise = buster.create(this);
            promise.id = id++;

            if (func) {
                func(this);
            }

            return promise;
        },

        then: function (resolve, reject) {
            var listener = { resolve: resolve, reject: reject };

            if (this.state == states.unresolved) {
                this.callbacks = this.callbacks || [];
                this.callbacks.push(listener);
            } else {
                notify.call(this, listener);
            }

            return this;
        },

        resolve: function () {
            return fulfill.call(this, "resolve", arguments);
        },

        reject: function () {
            return fulfill.call(this, "reject", arguments);
        }
    };

    buster.promise.sequential = function (funcs, opt) {
        opt = opt || {};
        var promise = buster.promise.create();
        var next = function () { runOne(funcs.shift()); }

        if (typeof funcs.slice == "function") {
            funcs = funcs.slice();
        }

        function runOne(func) {
            var resolution;

            if (!func) {
                return promise.resolve();
            }

            try {
                resolution = func.call(opt.thisObj);
            } catch (e) {
                if (opt.error) {
                    opt.error(e);
                } else {
                    promise.reject(e);
                    return;
                }
            }

            if (resolution) {
                resolution.then(next, function () {
                    promise.reject.apply(promise, arguments);
                });
            } else {
                buster.nextTick(next);
            }
        }

        buster.nextTick(next);
        return promise;
    };

    buster.promise.thenable = function (val) {
        if (!val || typeof val.then != "function") {
            var promise = buster.promise.create();
            promise.resolve(val);

            return promise;
        }

        return val;
    };

    buster.promise.all = function () {
        var promise = buster.promise.create();
        var promises = arguments;

        if (arguments.length == 1 &&
            Object.prototype.toString.call(arguments[0]) == "[object Array]") {
            promises = arguments[0];
        }

        var count = promises.length;
        var done = false;
        var data = [];

        function rejecter() {
            if (!done) {
                promise.reject.apply(promise, arguments);
                done = true;
            }
        }

        function resolver(index) {
            return function () {
                if (done) {
                    return;
                }

                data[index] = Array.prototype.slice.call(arguments);
                count -= 1;

                if (count <= 0) {
                    promise.resolve.apply(promise, data);
                    done = true;
                }
            }
        }

        for (var i = 0, l = count; i < l; ++i) {
            promises[i].then(resolver(i), rejecter);
        }

        if (promises.length == 0) {
            promise.resolve();
            done = true;
        }

        return promise;
    };
}());

if (typeof module != "undefined") {
    module.exports = buster.promise;
}/*jslint eqeqeq: false, onevar: false, forin: true, nomen: false, regexp: false, plusplus: false*/
/*global module, require, __dirname, document*/
/**
 * Sinon core utilities. For internal use only.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2011 Christian Johansen
 */
"use strict";

var sinon = (function () {
    var div = typeof document != "undefined" && document.createElement("div");

    function isNode(obj) {
        var success = false;

        try {
            obj.appendChild(div);
            success = div.parentNode == obj;
        } catch (e) {
            return false;
        } finally {
            try {
                obj.removeChild(div);
            } catch (e) {}
        }

        return success;
    }

    function isElement(obj) {
        return div && obj && obj.nodeType === 1 && isNode(obj);
    }

    return {
        wrapMethod: function wrapMethod(object, property, method) {
            if (!object) {
                throw new TypeError("Should wrap property of object");
            }

            if (typeof method != "function") {
                throw new TypeError("Method wrapper should be function");
            }

            var wrappedMethod = object[property];
            var type = typeof wrappedMethod;

            if (type != "function") {
                throw new TypeError("Attempted to wrap " + type + " property " + property +
                                    " as function");
            }

            if (wrappedMethod.restore && wrappedMethod.restore.sinon) {
                throw new TypeError("Attempted to wrap " + property + " which is already wrapped");
            }

            if (wrappedMethod.calledBefore) {
                var verb = !!wrappedMethod.returns ? "stubbed" : "spied on";
                throw new TypeError("Attempted to wrap " + property + " which is already " + verb);
            }

            object[property] = method;
            method.displayName = property;

            method.restore = function () {
                object[property] = wrappedMethod;
            };

            method.restore.sinon = true;

            return method;
        },

        extend: function extend(target) {
            for (var i = 1, l = arguments.length; i < l; i += 1) {
                for (var prop in arguments[i]) {
                    if (arguments[i].hasOwnProperty(prop)) {
                        target[prop] = arguments[i][prop];
                    }

                    // DONT ENUM bug, only care about toString
                    if (arguments[i].hasOwnProperty("toString") &&
                        arguments[i].toString != target.toString) {
                        target.toString = arguments[i].toString;
                    }
                }
            }

            return target;
        },

        create: function create(proto) {
            var F = function () {};
            F.prototype = proto;
            return new F();
        },

        deepEqual: function deepEqual(a, b) {
            if (typeof a != "object" || typeof b != "object") {
                return a === b;
            }

            if (isElement(a) || isElement(b)) {
                return a === b;
            }

            if (a === b) {
                return true;
            }

            if (Object.prototype.toString.call(a) == "[object Array]") {
                if (a.length !== b.length) {
                    return false;
                }

                for (var i = 0, l = a.length; i < l; i += 1) {
                    if (!deepEqual(a[i], b[i])) {
                        return false;
                    }
                }

                return true;
            }

            var prop, aLength = 0, bLength = 0;

            for (prop in a) {
                aLength += 1;

                if (!deepEqual(a[prop], b[prop])) {
                    return false;
                }
            }

            for (prop in b) {
                bLength += 1;
            }

            if (aLength != bLength) {
                return false;
            }

            return true;
        },

        keys: function keys(object) {
            var objectKeys = [];

            for (var prop in object) {
                if (object.hasOwnProperty(prop)) {
                    objectKeys.push(prop);
                }
            }

            return objectKeys.sort();
        },

        functionName: function functionName(func) {
            var name = func.displayName || func.name;

            // Use function decomposition as a last resort to get function
            // name. Does not rely on function decomposition to work - if it
            // doesn't debugging will be slightly less informative
            // (i.e. toString will say 'spy' rather than 'myFunc').
            if (!name) {
                var matches = func.toString().match(/function ([^\s\(]+)/);
                name = matches && matches[1];
            }

            return name;
        },

        functionToString: function toString() {
            if (this.getCall && this.callCount) {
                var thisValue, prop, i = this.callCount;

                while (i--) {
                    thisValue = this.getCall(i).thisValue;

                    for (prop in thisValue) {
                        if (thisValue[prop] === this) {
                            return prop;
                        }
                    }
                }
            }

            return this.displayName || "sinon fake";
        },

        getConfig: function (custom) {
            var config = {};
            custom = custom || {};
            var defaults = sinon.defaultConfig;

            for (var prop in defaults) {
                if (defaults.hasOwnProperty(prop)) {
                    config[prop] = custom.hasOwnProperty(prop) ? custom[prop] : defaults[prop];
                }
            }

            return config;
        },

        format: function (val) {
            return "" + val;
        },

        defaultConfig: {
            injectIntoThis: true,
            injectInto: null,
            properties: ["spy", "stub", "mock", "clock", "server", "requests"],
            useFakeTimers: true,
            useFakeServer: true
        }
    };
}());

if (typeof module == "object" && typeof require == "function") {
    module.exports = sinon;
    module.exports.spy = require("./sinon/spy");
    module.exports.stub = require("./sinon/stub");
    module.exports.mock = require("./sinon/mock");
    module.exports.collection = require("./sinon/collection");
    module.exports.assert = require("./sinon/assert");
    module.exports.sandbox = require("./sinon/sandbox");
    module.exports.test = require("./sinon/test");
    module.exports.testCase = require("./sinon/test_case");
    module.exports.assert = require("./sinon/assert");
}
/* @depend ../sinon.js */
/*jslint eqeqeq: false, onevar: false, plusplus: false*/
/*global module, require, sinon*/
/**
 * Spy functions
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2011 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module == "object" && typeof require == "function";
    var spyCall;
    var callId = 0;

    if (!sinon && commonJSModule) {
        sinon = require("sinon");
    }

    if (!sinon) {
        return;
    }

    function spy(object, property) {
        if (!property && typeof object == "function") {
            return spy.create(object);
        }

        if (!object || !property) {
            return spy.create(function () {});
        }

        var method = object[property];
        return sinon.wrapMethod(object, property, spy.create(method));
    }

    sinon.extend(spy, (function () {
        var slice = Array.prototype.slice;

        function delegateToCalls(api, method, matchAny, actual) {
            api[method] = function () {
                if (!this.called) {
                    return false;
                }

                var currentCall;
                var matches = 0;

                for (var i = 0, l = this.callCount; i < l; i += 1) {
                    currentCall = this.getCall(i);

                    if (currentCall[actual || method].apply(currentCall, arguments)) {
                        matches += 1;

                        if (matchAny) {
                            return true;
                        }
                    }
                }

                return matches === this.callCount;
            };
        }

        function matchingFake(fakes, args, strict) {
            if (!fakes) {
                return;
            }

            var alen = args.length;

            for (var i = 0, l = fakes.length; i < l; i++) {
                if (fakes[i].matches(args, strict)) {
                    return fakes[i];
                }
            }
        }

        var uuid = 0;

        // Public API
        var spyApi = {
            reset: function () {
                this.called = false;
                this.calledOnce = false;
                this.calledTwice = false;
                this.calledThrice = false;
                this.callCount = 0;
                this.args = [];
                this.returnValues = [];
                this.thisValues = [];
                this.exceptions = [];
                this.callIds = [];
            },

            create: function create(func) {
                var name;

                if (typeof func != "function") {
                    func = function () {};
                } else {
                    name = sinon.functionName(func);
                }

                function proxy() {
                    return proxy.invoke(func, this, slice.call(arguments));
                }

                sinon.extend(proxy, spy);
                delete proxy.create;
                sinon.extend(proxy, func);

                proxy.reset();
                proxy.prototype = func.prototype;
                proxy.displayName = name || "spy";
                proxy.toString = sinon.functionToString;
                proxy._create = sinon.spy.create;
                proxy.id = "spy#" + uuid++;

                return proxy;
            },

            invoke: function invoke(func, thisValue, args) {
                var matching = matchingFake(this.fakes, args);
                var exception, returnValue;
                this.called = true;
                this.callCount += 1;
                this.calledOnce = this.callCount == 1;
                this.calledTwice = this.callCount == 2;
                this.calledThrice = this.callCount == 3;
                this.thisValues.push(thisValue);
                this.args.push(args);
                this.callIds.push(callId++);

                try {
                    if (matching) {
                        returnValue = matching.invoke(func, thisValue, args);
                    } else {
                        returnValue = (this.func || func).apply(thisValue, args);
                    }
                } catch (e) {
                    this.returnValues.push(undefined);
                    exception = e;
                    throw e;
                } finally {
                    this.exceptions.push(exception);
                }

                this.returnValues.push(returnValue);

                return returnValue;
            },

            getCall: function getCall(i) {
                if (i < 0 || i >= this.callCount) {
                    return null;
                }

                return spyCall.create(this, this.thisValues[i], this.args[i],
                                      this.returnValues[i], this.exceptions[i],
                                      this.callIds[i]);
            },

            calledBefore: function calledBefore(spyFn) {
                if (!this.called) {
                    return false;
                }

                if (!spyFn.called) {
                    return true;
                }

                return this.callIds[0] < spyFn.callIds[0];
            },

            calledAfter: function calledAfter(spyFn) {
                if (!this.called || !spyFn.called) {
                    return false;
                }

                return this.callIds[this.callCount - 1] > spyFn.callIds[spyFn.callCount - 1];
            },

            withArgs: function () {
                var args = slice.call(arguments);

                if (this.fakes) {
                    var match = matchingFake(this.fakes, args, true);

                    if (match) {
                        return match;
                    }
                } else {
                    this.fakes = [];
                }

                var original = this;
                var fake = this._create();
                fake.matchingAguments = args;
                this.fakes.push(fake);

                fake.withArgs = function () {
                    return original.withArgs.apply(original, arguments);
                };

                return fake;
            },

            matches: function (args, strict) {
                var margs = this.matchingAguments;

                if (margs.length <= args.length &&
                    sinon.deepEqual(margs, args.slice(0, margs.length))) {
                    return !strict || margs.length == args.length;
                }
            }
        };

        delegateToCalls(spyApi, "calledOn", true);
        delegateToCalls(spyApi, "alwaysCalledOn", false, "calledOn");
        delegateToCalls(spyApi, "calledWith", true);
        delegateToCalls(spyApi, "alwaysCalledWith", false, "calledWith");
        delegateToCalls(spyApi, "calledWithExactly", true);
        delegateToCalls(spyApi, "alwaysCalledWithExactly", false, "calledWithExactly");
        delegateToCalls(spyApi, "threw", true);
        delegateToCalls(spyApi, "alwaysThrew", false, "threw");
        delegateToCalls(spyApi, "returned", true);
        delegateToCalls(spyApi, "alwaysReturned", false, "returned");

        return spyApi;
    }()));

    spyCall = (function () {
        return {
            create: function create(spy, thisValue, args, returnValue, exception, id) {
                var proxyCall = sinon.create(spyCall);
                delete proxyCall.create;
                proxyCall.proxy = spy;
                proxyCall.thisValue = thisValue;
                proxyCall.args = args;
                proxyCall.returnValue = returnValue;
                proxyCall.exception = exception;
                proxyCall.callId = typeof id == "number" && id || callId++;

                return proxyCall;
            },

            calledOn: function calledOn(thisValue) {
                return this.thisValue === thisValue;
            },

            calledWith: function calledWith() {
                for (var i = 0, l = arguments.length; i < l; i += 1) {
                    if (!sinon.deepEqual(arguments[i], this.args[i])) {
                        return false;
                    }
                }

                return true;
            },

            calledWithExactly: function calledWithExactly() {
                return arguments.length == this.args.length &&
                    this.calledWith.apply(this, arguments);
            },

            returned: function returned(value) {
                return this.returnValue === value;
            },

            threw: function threw(error) {
                if (typeof error == "undefined" || !this.exception) {
                    return !!this.exception;
                }

                if (typeof error == "string") {
                    return this.exception.name == error;
                }

                return this.exception === error;
            },

            calledBefore: function (other) {
                return this.callId < other.callId;
            },

            calledAfter: function (other) {
                return this.callId > other.callId;
            },

            toString: function () {
                var callStr = this.proxy.toString() + "(";
                var args = [];

                for (var i = 0, l = this.args.length; i < l; ++i) {
                    args.push(sinon.format(this.args[i]));
                }

                callStr = callStr + args.join(", ") + ")";

                if (typeof this.returnValue != "undefined") {
                    callStr += " => " + sinon.format(this.returnValue);
                }

                if (this.exception) {
                    callStr += " !" + this.exception.name;

                    if (this.exception.message) {
                        callStr += "(" + this.exception.message + ")";
                    }
                }

                return callStr;
            }
        };
    }());

    if (commonJSModule) {
        module.exports = spy;
    } else {
        sinon.spy = spy;
    }

    sinon.spyCall = spyCall;
}(typeof sinon == "object" && sinon || null));
/**
 * @depend ../sinon.js
 * @depend spy.js
 */
/*jslint eqeqeq: false, onevar: false*/
/*global module, require, sinon*/
/**
 * Stub functions
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2011 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module == "object" && typeof require == "function";

    if (!sinon && commonJSModule) {
        sinon = require("sinon");
    }

    if (!sinon) {
        return;
    }

    function stub(object, property, func) {
        if (!!func && typeof func != "function") {
            throw new TypeError("Custom stub should be function");
        }

        var wrapper;

        if (func) {
            wrapper = sinon.spy && sinon.spy.create ? sinon.spy.create(func) : func;
        } else {
            wrapper = stub.create();
        }

        if (!object && !property) {
            return sinon.stub.create();
        }

        if (!property && !!object && typeof object == "object") {
            for (var prop in object) {
                if (object.hasOwnProperty(prop) && typeof object[prop] == "function") {
                    stub(object, prop);
                }
            }

            return object;
        }

        return sinon.wrapMethod(object, property, wrapper);
    }

    function getCallback(stub, args) {
        if (stub.callArgAt < 0) {
            for (var i = 0, l = args.length; i < l; ++i) {
                if (!stub.callArgProp && typeof args[i] == "function") {
                    return args[i];
                }

                if (stub.callArgProp && args[i] &&
                    typeof args[i][stub.callArgProp] == "function") {
                    return args[i][stub.callArgProp];
                }
            }

            return null;
        }

        return args[stub.callArgAt];
    }

    var join = Array.prototype.join;

    function getCallbackError(stub, func, args) {
        if (stub.callArgAt < 0) {
            var msg;

            if (stub.callArgProp) {
                msg = sinon.functionName(stub) +
                    " expected to yield to '" + stub.callArgProp +
                    "', but no object with such a property was passed."
            } else {
                msg = sinon.functionName(stub) +
                            " expected to yield, but no callback was passed."
            }

            if (args.length > 0) {
                msg += " Received [" + join.call(args, ", ") + "]";
            }

            return msg;
        }

        return "argument at index " + stub.callArgAt + " is not a function: " + func;
    }

    function callCallback(stub, args) {
        if (typeof stub.callArgAt == "number") {
            var func = getCallback(stub, args);

            if (typeof func != "function") {
                throw new TypeError(getCallbackError(stub, func, args));
            }

            func.apply(null, stub.callbackArguments);
        }
    }

    var uuid = 0;

    sinon.extend(stub, (function () {
        var slice = Array.prototype.slice;

        function throwsException(error, message) {
            if (typeof error == "string") {
                this.exception = new Error(message || "");
                this.exception.name = error;
            } else if (!error) {
                this.exception = new Error("Error");
            } else {
                this.exception = error;
            }
            
            return this;
        }

        return {
            create: function create() {
                var functionStub = function () {
                    if (functionStub.exception) {
                        throw functionStub.exception;
                    }

                    callCallback(functionStub, arguments);

                    return functionStub.returnValue;
                };

                functionStub.id = "stub#" + uuid++;
                var orig = functionStub;
                functionStub = sinon.spy.create(functionStub);
                functionStub.func = orig;

                sinon.extend(functionStub, stub);
                functionStub._create = sinon.stub.create;
                functionStub.displayName = "stub";
                functionStub.toString = sinon.functionToString;

                return functionStub;
            },

            returns: function returns(value) {
                this.returnValue = value;

                return this;
            },

            "throws": throwsException,
            throwsException: throwsException,

            callsArg: function callsArg(pos) {
                if (typeof pos != "number") {
                    throw new TypeError("argument index is not number");
                }

                this.callArgAt = pos;
                this.callbackArguments = [];

                return this;
            },

            callsArgWith: function callsArgWith(pos) {
                if (typeof pos != "number") {
                    throw new TypeError("argument index is not number");
                }

                this.callArgAt = pos;
                this.callbackArguments = slice.call(arguments, 1);

                return this;
            },

            yields: function () {
                this.callArgAt = -1;
                this.callbackArguments = slice.call(arguments, 0);

                return this;
            },

            yieldsTo: function (prop) {
                this.callArgAt = -1;
                this.callArgProp = prop;
                this.callbackArguments = slice.call(arguments, 1);

                return this;
            }
        };
    }()));

    if (commonJSModule) {
        module.exports = stub;
    } else {
        sinon.stub = stub;
    }
}(typeof sinon == "object" && sinon || null));
/**
 * @depend ../sinon.js
 * @depend stub.js
 */
/*jslint eqeqeq: false, onevar: false, nomen: false*/
/*global module, require, sinon*/
/**
 * Mock functions.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2011 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module == "object" && typeof require == "function";

    if (!sinon && commonJSModule) {
        sinon = require("sinon");
    }

    if (!sinon) {
        return;
    }

    function mock(object) {
        if (!object) {
            return sinon.expectation.create("Anonymous mock");
        }

        return mock.create(object);
    }

    sinon.mock = mock;

    sinon.extend(mock, (function () {
        function each(collection, callback) {
            if (!collection) {
                return;
            }

            for (var i = 0, l = collection.length; i < l; i += 1) {
                callback(collection[i]);
            }
        }

        return {
            create: function create(object) {
                if (!object) {
                    throw new TypeError("object is null");
                }

                var mockObject = sinon.extend({}, mock);
                mockObject.object = object;
                delete mockObject.create;

                return mockObject;
            },

            expects: function expects(method) {
                if (!method) {
                    throw new TypeError("method is falsy");
                }

                if (!this.expectations) {
                    this.expectations = {};
                    this.proxies = [];
                }

                if (!this.expectations[method]) {
                    this.expectations[method] = [];
                    var mockObject = this;

                    sinon.wrapMethod(this.object, method, function () {
                        return mockObject.invokeMethod(method, this, arguments);
                    });

                    this.proxies.push(method);
                }

                var expectation = sinon.expectation.create(method);
                this.expectations[method].push(expectation);

                return expectation;
            },

            restore: function restore() {
                var object = this.object;

                each(this.proxies, function (proxy) {
                    if (typeof object[proxy].restore == "function") {
                        object[proxy].restore();
                    }
                });
            },

            verify: function verify() {
                var expectations = this.expectations || {};
                var messages = [], met = [];

                each(this.proxies, function (proxy) {
                    each(expectations[proxy], function (expectation) {
                        if (!expectation.met()) {
                            messages.push(expectation.toString());
                        } else {
                            met.push(expectation.toString());
                        }
                    });
                });

                this.restore();

                if (messages.length > 0) {
                    err(messages.concat(met).join("\n"));
                }

                return true;
            },

            invokeMethod: function invokeMethod(method, thisValue, args) {
                var expectations = this.expectations && this.expectations[method];
                var length = expectations && expectations.length || 0;

                for (var i = 0; i < length; i += 1) {
                    if (!expectations[i].met() &&
                        expectations[i].allowsCall(thisValue, args)) {
                        return expectations[i].apply(thisValue, args);
                    }
                }

                var messages = [];

                for (i = 0; i < length; i += 1) {
                    messages.push("    " + expectations[i].toString());
                }

                messages.unshift("Unexpected call: " + sinon.spyCall.toString.call({
                    proxy: method,
                    args: args
                }));

                err(messages.join("\n"));
            }
        };
    }()));

    function err(message) {
        var exception = new Error(message);
        exception.name = "ExpectationError";

        throw exception;
    }

    sinon.expectation = (function () {
        var slice = Array.prototype.slice;
        var _invoke = sinon.spy.invoke;

        function timesInWords(times) {
            if (times == 0) {
                return "never";
            } else if (times == 1) {
                return "once";
            } else if (times == 2) {
                return "twice";
            } else if (times == 3) {
                return "thrice";
            }

            return times + " times";
        }

        function callCountInWords(callCount) {
            if (callCount == 0) {
                return "never called";
            } else {
                return "called " + timesInWords(callCount);
            }
        }

        function expectedCallCountInWords(expectation) {
            var min = expectation.minCalls;
            var max = expectation.maxCalls;

            if (typeof min == "number" && typeof max == "number") {
                var str = timesInWords(min);

                if (min != max) {
                    str = "at least " + str + " and at most " + timesInWords(max);
                }

                return str;
            }

            if (typeof min == "number") {
                return "at least " + timesInWords(min);
            }

            return "at most " + timesInWords(max);
        }

        function receivedMinCalls(expectation) {
            var hasMinLimit = typeof expectation.minCalls == "number";
            return !hasMinLimit || expectation.callCount >= expectation.minCalls;
        }

        function receivedMaxCalls(expectation) {
            if (typeof expectation.maxCalls != "number") {
                return false;
            }

            return expectation.callCount == expectation.maxCalls;
        }

        return {
            minCalls: 1,
            maxCalls: 1,

            create: function create(methodName) {
                var expectation = sinon.extend(sinon.stub.create(), sinon.expectation);
                delete expectation.create;
                expectation.method = methodName;

                return expectation;
            },

            invoke: function invoke(func, thisValue, args) {
                this.verifyCallAllowed(thisValue, args);

                return _invoke.apply(this, arguments);
            },

            atLeast: function atLeast(num) {
                if (typeof num != "number") {
                    throw new TypeError("'" + num + "' is not number");
                }

                if (!this.limitsSet) {
                    this.maxCalls = null;
                    this.limitsSet = true;
                }

                this.minCalls = num;

                return this;
            },

            atMost: function atMost(num) {
                if (typeof num != "number") {
                    throw new TypeError("'" + num + "' is not number");
                }

                if (!this.limitsSet) {
                    this.minCalls = null;
                    this.limitsSet = true;
                }

                this.maxCalls = num;

                return this;
            },

            never: function never() {
                return this.exactly(0);
            },

            once: function once() {
                return this.exactly(1);
            },

            twice: function twice() {
                return this.exactly(2);
            },

            thrice: function thrice() {
                return this.exactly(3);
            },

            exactly: function exactly(num) {
                if (typeof num != "number") {
                    throw new TypeError("'" + num + "' is not a number");
                }

                this.atLeast(num);
                return this.atMost(num);
            },

            met: function met() {
                return !this.failed && receivedMinCalls(this);
            },

            verifyCallAllowed: function verifyCallAllowed(thisValue, args) {
                if (receivedMaxCalls(this)) {
                    this.failed = true;
                    err(this.method + " already called " + timesInWords(this.maxCalls));
                }

                if ("expectedThis" in this && this.expectedThis !== thisValue) {
                    err(this.method + " called with " + thisValue + " as thisValue, expected " +
                        this.expectedThis);
                }

                if (!("expectedArguments" in this)) {
                    return;
                }

                if (!args || args.length === 0) {
                    err(this.method + " received no arguments, expected " +
                        this.expectedArguments.join());
                }

                if (args.length < this.expectedArguments.length) {
                    err(this.method + " received too few arguments (" + args.join() +
                        "), expected " + this.expectedArguments.join());
                }

                if (this.expectsExactArgCount &&
                    args.length != this.expectedArguments.length) {
                    err(this.method + " received too many arguments (" + args.join() +
                        "), expected " + this.expectedArguments.join());
                }

                for (var i = 0, l = this.expectedArguments.length; i < l; i += 1) {
                    if (!sinon.deepEqual(this.expectedArguments[i], args[i])) {
                        err(this.method + " received wrong arguments (" + args.join() +
                            "), expected " + this.expectedArguments.join());
                    }
                }
            },

            allowsCall: function allowsCall(thisValue, args) {
                if (this.met()) {
                    return false;
                }

                if ("expectedThis" in this && this.expectedThis !== thisValue) {
                    return false;
                }

                if (!("expectedArguments" in this)) {
                    return true;
                }

                args = args || [];

                if (args.length < this.expectedArguments.length) {
                    return false;
                }

                if (this.expectsExactArgCount &&
                    args.length != this.expectedArguments.length) {
                    return false;
                }

                for (var i = 0, l = this.expectedArguments.length; i < l; i += 1) {
                    if (!sinon.deepEqual(this.expectedArguments[i], args[i])) {
                        return false;
                    }
                }

                return true;
            },

            withArgs: function withArgs() {
                this.expectedArguments = slice.call(arguments);
                return this;
            },

            withExactArgs: function withExactArgs() {
                this.withArgs.apply(this, arguments);
                this.expectsExactArgCount = true;
                return this;
            },

            on: function on(thisValue) {
                this.expectedThis = thisValue;
                return this;
            },

            toString: function () {
                var args = (this.expectedArguments || []).slice();

                if (!this.expectsExactArgCount) {
                    args.push("[...]");
                }

                var callStr = sinon.spyCall.toString.call({
                    proxy: this.method, args: args
                });

                var message = callStr.replace(", [...", "[, ...") + " " +
                    expectedCallCountInWords(this);

                if (this.met()) {
                    return "Expectation met: " + message;
                }

                return "Expected " + message + " (" +
                    callCountInWords(this.callCount) + ")";
            },

            verify: function verify() {
                if (!this.met()) {
                    err(this.toString());
                }

                return true;
            }
        };
    }());

    if (commonJSModule) {
        module.exports = mock;
    } else {
        sinon.mock = mock;
    }
}(typeof sinon == "object" && sinon || null));
/**
 * @depend ../sinon.js
 * @depend stub.js
 * @depend mock.js
 */
/*jslint eqeqeq: false, onevar: false, forin: true*/
/*global module, require, sinon*/
/**
 * Collections of stubs, spies and mocks.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2011 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module == "object" && typeof require == "function";

    if (!sinon && commonJSModule) {
        sinon = require("sinon");
    }

    if (!sinon) {
        return;
    }

    function getFakes(fakeCollection) {
        if (!fakeCollection.fakes) {
            fakeCollection.fakes = [];
        }

        return fakeCollection.fakes;
    }

    function each(fakeCollection, method) {
        var fakes = getFakes(fakeCollection);

        for (var i = 0, l = fakes.length; i < l; i += 1) {
            if (typeof fakes[i][method] == "function") {
                fakes[i][method]();
            }
        }
    }

    var collection = {
        verify: function resolve() {
            each(this, "verify");
        },

        restore: function restore() {
            each(this, "restore");
        },

        verifyAndRestore: function verifyAndRestore() {
            var exception;

            try {
                this.verify();
            } catch (e) {
                exception = e;
            }

            this.restore();

            if (exception) {
                throw exception;
            }
        },

        add: function add(fake) {
            getFakes(this).push(fake);

            return fake;
        },

        spy: function spy() {
            return this.add(sinon.spy.apply(sinon, arguments));
        },

        stub: function stub(object, property, value) {
            if (property) {
                var original = object[property];

                if (typeof original != "function") {
                    if (!object.hasOwnProperty(property)) {
                        throw new TypeError("Cannot stub non-existent own property " + property);
                    }

                    object[property] = value;

                    return this.add({
                        restore: function () {
                            object[property] = original;
                        }
                    });
                }
            }

            return this.add(sinon.stub.apply(sinon, arguments));
        },

        mock: function mock() {
            return this.add(sinon.mock.apply(sinon, arguments));
        },

        inject: function inject(obj) {
            var col = this;

            obj.spy = function () {
                return col.spy.apply(col, arguments);
            };

            obj.stub = function () {
                return col.stub.apply(col, arguments);
            };

            obj.mock = function () {
                return col.mock.apply(col, arguments);
            };

            return obj;
        }
    };

    if (commonJSModule) {
        module.exports = collection;
    } else {
        sinon.collection = collection;
    }
}(typeof sinon == "object" && sinon || null));
/**
 * @depend ../sinon.js
 * @depend collection.js
 * @depend util/fake_timers.js
 * @depend util/fake_server_with_clock.js
 */
/*jslint eqeqeq: false, onevar: false, plusplus: false*/
/*global require, module*/
/**
 * Manages fake collections as well as fake utilities such as Sinon's
 * timers and fake XHR implementation in one convenient object.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2011 Christian Johansen
 */
"use strict";

if (typeof module == "object" && typeof require == "function") {
    var sinon = require("sinon");
    sinon.extend(sinon, require("./util/fake_timers"));
}

(function () {
    function exposeValue(sandbox, config, key, value) {
        if (!value) {
            return;
        }

        if (config.injectInto) {
            config.injectInto[key] = value;
        } else {
            sandbox.args.push(value);
        }
    }

    function prepareSandboxFromConfig(config) {
        var sandbox = sinon.create(sinon.sandbox);

        if (config.useFakeServer) {
            if (typeof config.useFakeServer == "object") {
                sandbox.serverPrototype = config.useFakeServer;
            }

            sandbox.useFakeServer();
        }

        if (config.useFakeTimers) {
            if (typeof config.useFakeTimers == "object") {
                sandbox.useFakeTimers.apply(sandbox, config.useFakeTimers);
            } else {
                sandbox.useFakeTimers();
            }
        }

        return sandbox;
    }

    sinon.sandbox = sinon.extend(sinon.create(sinon.collection), {
        useFakeTimers: function useFakeTimers() {
            this.clock = sinon.useFakeTimers.apply(sinon, arguments);

            return this.add(this.clock);
        },

        serverPrototype: sinon.fakeServer,

        useFakeServer: function useFakeServer() {
            var proto = this.serverPrototype || sinon.fakeServer;

            if (!proto || !proto.create) {
                return null;
            }

            this.server = proto.create();
            return this.add(this.server);
        },

        inject: function (obj) {
            sinon.collection.inject.call(this, obj);

            if (this.clock) {
                obj.clock = this.clock;
            }

            if (this.server) {
                obj.server = this.server;
                obj.requests = this.server.requests;
            }

            return obj;
        },

        create: function (config) {
            if (!config) {
                return sinon.create(sinon.sandbox);
            }

            var sandbox = prepareSandboxFromConfig(config);
            sandbox.args = sandbox.args || [];
            var prop, value, exposed = sandbox.inject({});

            if (config.properties) {
                for (var i = 0, l = config.properties.length; i < l; i++) {
                    prop = config.properties[i];
                    value = exposed[prop] || prop == "sandbox" && sandbox;
                    exposeValue(sandbox, config, prop, value);
                }
            } else {
                exposeValue(sandbox, config, "sandbox", value);
            }

            return sandbox;
        }
    });

    sinon.sandbox.useFakeXMLHttpRequest = sinon.sandbox.useFakeServer;

    if (typeof module != "undefined") {
        module.exports = sinon.sandbox;
    }
}());
/**
 * @depend ../sinon.js
 * @depend stub.js
 * @depend mock.js
 * @depend sandbox.js
 */
/*jslint eqeqeq: false, onevar: false, forin: true, plusplus: false*/
/*global module, require, sinon*/
/**
 * Test function, sandboxes fakes
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2011 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module == "object" && typeof require == "function";

    if (!sinon && commonJSModule) {
        sinon = require("sinon");
    }

    if (!sinon) {
        return;
    }

    function test(callback) {
        var type = typeof callback;

        if (type != "function") {
            throw new TypeError("sinon.test needs to wrap a test function, got " + type);
        }

        return function () {
            var config = sinon.getConfig(sinon.config);
            config.injectInto = config.injectIntoThis && this || config.injectInto;
            var sandbox = sinon.sandbox.create(config);
            var exception, result;
            var args = Array.prototype.slice.call(arguments).concat(sandbox.args);

            try {
                result = callback.apply(this, args);
            } catch (e) {
                exception = e;
            }

            sandbox.verifyAndRestore();

            if (exception) {
                throw exception;
            }

            return result;
        };
    }

    test.config = {
        injectIntoThis: true,
        injectInto: null,
        properties: ["spy", "stub", "mock", "clock", "server", "requests"],
        useFakeTimers: true,
        useFakeServer: true
    };

    if (commonJSModule) {
        module.exports = test;
    } else {
        sinon.test = test;
    }
}(typeof sinon == "object" && sinon || null));
/**
 * @depend ../sinon.js
 * @depend test.js
 */
/*jslint eqeqeq: false, onevar: false, eqeqeq: false*/
/*global module, require, sinon*/
/**
 * Test case, sandboxes all test functions
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2011 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module == "object" && typeof require == "function";

    if (!sinon && commonJSModule) {
        sinon = require("sinon");
    }

    if (!sinon || !Object.prototype.hasOwnProperty) {
        return;
    }

    function createTest(property, setUp, tearDown) {
        return function () {
            if (setUp) {
                setUp.apply(this, arguments);
            }

            var exception, result;

            try {
                result = property.apply(this, arguments);
            } catch (e) {
                exception = e;
            }

            if (tearDown) {
                tearDown.apply(this, arguments);
            }

            if (exception) {
                throw exception;
            }

            return result;
        };
    }

    function testCase(tests, prefix) {
        /*jsl:ignore*/
        if (!tests || typeof tests != "object") {
            throw new TypeError("sinon.testCase needs an object with test functions");
        }
        /*jsl:end*/

        prefix = prefix || "test";
        var rPrefix = new RegExp("^" + prefix);
        var methods = {}, testName, property, method;
        var setUp = tests.setUp;
        var tearDown = tests.tearDown;

        for (testName in tests) {
            if (tests.hasOwnProperty(testName)) {
                property = tests[testName];

                if (/^(setUp|tearDown)$/.test(testName)) {
                    continue;
                }

                if (typeof property == "function" && rPrefix.test(testName)) {
                    method = property;

                    if (setUp || tearDown) {
                        method = createTest(property, setUp, tearDown);
                    }

                    methods[testName] = sinon.test(method);
                } else {
                    methods[testName] = tests[testName];
                }
            }
        }

        return methods;
    }

    if (commonJSModule) {
        module.exports = testCase;
    } else {
        sinon.testCase = testCase;
    }
}(typeof sinon == "object" && sinon || null));
/**
 * @depend ../sinon.js
 * @depend stub.js
 */
/*jslint eqeqeq: false, onevar: false, nomen: false, plusplus: false*/
/*global module, require, sinon*/
/**
 * Assertions matching the test spy retrieval interface.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2011 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module == "object" && typeof require == "function";
    var slice = Array.prototype.slice;
    var assert;

    if (!sinon && commonJSModule) {
        sinon = require("sinon");
    }

    if (!sinon) {
        return;
    }

    function times(count) {
        return count == 1 && "once" ||
            count == 2 && "twice" ||
            count == 3 && "thrice" ||
            (count || 0) + " times";
    }

    function verifyIsStub(method) {
        if (!method) {
            assert.fail("fake is not a spy");
        }

        if (typeof method != "function") {
            assert.fail(method + " is not a function");
        }

        if (typeof method.getCall != "function") {
            assert.fail(method + " is not stubbed");
        }
    }

    function failAssertion(object, msg) {
        var failMethod = object.fail || assert.fail;
        failMethod.call(object, msg);
    }

    function mirrorAssertion(method, message) {
        assert[method] = function (fake) {
            verifyIsStub(fake);

            var failed = typeof fake[method] == "function" ?
                !fake[method].apply(fake, slice.call(arguments, 1)) : !fake[method];

            if (failed) {
                var msg = message.replace("%c", times(fake.callCount));
                msg = msg.replace("%n", fake + "");

                msg = msg.replace("%C", function (m) {
                    return formatSpyCalls(fake);
                });

                msg = msg.replace("%t", function (m) {
                    return formatThisValues(fake);
                });

                msg = msg.replace("%*", [].slice.call(arguments, 1).join(", "));

                for (var i = 0, l = arguments.length; i < l; i++) {
                    msg = msg.replace("%" + i, arguments[i]);
                }

                failAssertion(this, msg);
            } else {
                assert.pass(method);
            }
        };
    }

    function formatSpyCalls(spy) {
        var calls = [];

        for (var i = 0, l = spy.callCount; i < l; ++i) {
            calls.push("    " + spy.getCall(i).toString());
        }

        return calls.length > 0 ? "\n" + calls.join("\n") : "";
    }

    function formatThisValues(spy) {
        var objects = [];

        for (var i = 0, l = spy.callCount; i < l; ++i) {
            objects.push(sinon.format(spy.thisValues[i]));
        }

        return objects.join(", ");
    }

    assert = {
        failException: "AssertError",

        fail: function fail(message) {
            var error = new Error(message);
            error.name = this.failException || assert.failException;

            throw error;
        },

        pass: function pass(assertion) {},

        called: function assertCalled(method) {
            verifyIsStub(method);

            if (!method.called) {
                failAssertion(this, "expected " + method +
                              " to have been called at least once but was never called");
            } else {
                assert.pass("called");
            }
        },

        notCalled: function assertNotCalled(method) {
            verifyIsStub(method);

            if (method.called) {
                failAssertion(
                    this, "expected " + method + " to not have been called but was " +
                        "called " + times(method.callCount) + formatSpyCalls(method));
            } else {
                assert.pass("notCalled");
            }
        },

        callOrder: function assertCallOrder() {
            verifyIsStub(arguments[0]);
            var expected = [];
            var actual = [];
            var failed = false;
            expected.push(arguments[0]);

            for (var i = 1, l = arguments.length; i < l; i++) {
                verifyIsStub(arguments[i]);
                expected.push(arguments[i]);

                if (!arguments[i - 1].calledBefore(arguments[i])) {
                    failed = true;
                }
            }

            if (failed) {
                actual = [].concat(expected).sort(function (a, b) {
                    var aId = a.getCall(0).callId;
                    var bId = b.getCall(0).callId;

                    // uuid, won't ever be equal
                    return aId < bId ? -1 : 1;
                });

                var expectedStr, actualStr;

                try {
                    expectedStr = expected.join(", ");
                    actualStr = actual.join(", ");
                } catch (e) {}

                failAssertion(this, "expected " + (expectedStr || "") + " to be " +
                              "called in order but were called as " + actualStr);
            } else {
                assert.pass("callOrder");
            }
        },

        callCount: function assertCallCount(method, count) {
            verifyIsStub(method);

            if (method.callCount != count) {
                failAssertion(this, "expected " + method + " to be called " +
                              times(count) + " but was called " +
                              times(method.callCount) + formatSpyCalls(method));
            } else {
                assert.pass("callCount");
            }
        },

        expose: function expose(target, options) {
            if (!target) {
                throw new TypeError("target is null or undefined");
            }

            options = options || {};
            var prefix = typeof options.prefix == "undefined" && "assert" || options.prefix;

            var name = function (prop) {
                if (!prefix) {
                    return prop;
                }

                return prefix + prop.substring(0, 1).toUpperCase() + prop.substring(1);
            };

            for (var assertion in this) {
                if (!/^(fail|expose)/.test(assertion)) {
                    target[name(assertion)] = this[assertion];
                }
            }

            if (typeof options.includeFail == "undefined" || !!options.includeFail) {
                target.fail = this.fail;
                target.failException = this.failException;
            }

            return target;
        }
    };

    mirrorAssertion("calledOnce", "expected %n to be called once but was called %c%C");
    mirrorAssertion("calledTwice", "expected %n to be called twice but was called %c%C");
    mirrorAssertion("calledThrice", "expected %n to be called thrice but was called %c%C");
    mirrorAssertion("calledOn", "expected %n to be called with %1 as this but was called with %t");
    mirrorAssertion("alwaysCalledOn", "expected %n to always be called with %1 as this but was called with %t");
    mirrorAssertion("calledWith", "expected %n to be called with arguments %*%C");
    mirrorAssertion("alwaysCalledWith", "expected %n to always be called with arguments %*%C");
    mirrorAssertion("calledWithExactly", "expected %n to be called with exact arguments %*%C");
    mirrorAssertion("alwaysCalledWithExactly", "expected %n to always be called with exact arguments %*%C");
    mirrorAssertion("threw", "%n did not throw exception%C");
    mirrorAssertion("alwaysThrew", "%n did not always throw exception%C");

    if (commonJSModule) {
        module.exports = assert;
    } else {
        sinon.assert = assert;
    }
}(typeof sinon == "object" && sinon || null));
/*jslint eqeqeq: false, onevar: false*/
/*global sinon, module, require, ActiveXObject, XMLHttpRequest, DOMParser*/
/**
 * Fake XMLHttpRequest object
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2011 Christian Johansen
 */
"use strict";

if (typeof sinon == "undefined") {
    this.sinon = {};
}

sinon.xhr = { XMLHttpRequest: this.XMLHttpRequest };

sinon.FakeXMLHttpRequest = (function () {
    /*jsl:ignore*/
    var unsafeHeaders = {
        "Accept-Charset": true,
        "Accept-Encoding": true,
        "Connection": true,
        "Content-Length": true,
        "Cookie": true,
        "Cookie2": true,
        "Content-Transfer-Encoding": true,
        "Date": true,
        "Expect": true,
        "Host": true,
        "Keep-Alive": true,
        "Referer": true,
        "TE": true,
        "Trailer": true,
        "Transfer-Encoding": true,
        "Upgrade": true,
        "User-Agent": true,
        "Via": true
    };
    /*jsl:end*/

    function FakeXMLHttpRequest() {
        this.readyState = FakeXMLHttpRequest.UNSENT;
        this.requestHeaders = {};
        this.requestBody = null;
        this.status = 0;
        this.statusText = "";

        if (typeof FakeXMLHttpRequest.onCreate == "function") {
            FakeXMLHttpRequest.onCreate(this);
        }
    }

    function verifyState(xhr) {
        if (xhr.readyState !== FakeXMLHttpRequest.OPENED) {
            throw new Error("INVALID_STATE_ERR");
        }

        if (xhr.sendFlag) {
            throw new Error("INVALID_STATE_ERR");
        }
    }

    sinon.extend(FakeXMLHttpRequest.prototype, {
        async: true,

        open: function open(method, url, async, username, password) {
            this.method = method;
            this.url = url;
            this.async = typeof async == "boolean" ? async : true;
            this.username = username;
            this.password = password;
            this.responseText = null;
            this.responseXML = null;
            this.requestHeaders = {};
            this.sendFlag = false;
            this.readyStateChange(FakeXMLHttpRequest.OPENED);
        },

        readyStateChange: function readyStateChange(state) {
            this.readyState = state;

            if (typeof this.onreadystatechange == "function") {
                this.onreadystatechange();
            }
        },

        setRequestHeader: function setRequestHeader(header, value) {
            verifyState(this);

            if (unsafeHeaders[header] || /^(Sec-|Proxy-)/.test(header)) {
                throw new Error("Refused to set unsafe header \"" + header + "\"");
            }

            if (this.requestHeaders[header]) {
                this.requestHeaders[header] += "," + value; 
            } else {
                this.requestHeaders[header] = value;
            }
        },

        // Helps testing
        setResponseHeaders: function setResponseHeaders(headers) {
            this.responseHeaders = {};

            for (var header in headers) {
                if (headers.hasOwnProperty(header)) {
                    this.responseHeaders[header] = headers[header];
                }
            }

            if (this.async) {
                this.readyStateChange(FakeXMLHttpRequest.HEADERS_RECEIVED);
            }
        },

        // Currently treats ALL data as a DOMString (i.e. no Document)
        send: function send(data) {
            verifyState(this);

            if (!/^(get|head)$/i.test(this.method)) {
                if (this.requestHeaders["Content-Type"]) {
                    var value = this.requestHeaders["Content-Type"].split(";");
                    this.requestHeaders["Content-Type"] = value[0] + ";charset=utf-8";
                } else {
                    this.requestHeaders["Content-Type"] = "text/plain;charset=utf-8";
                }

                this.requestBody = data;
            }

            this.errorFlag = false;
            this.sendFlag = this.async;
            this.readyStateChange(FakeXMLHttpRequest.OPENED);

            if (typeof this.onSend == "function") {
                this.onSend(this);
            }
        },

        abort: function abort() {
            this.aborted = true;
            this.responseText = null;
            this.errorFlag = true;
            this.requestHeaders = {};

            if (this.readyState > sinon.FakeXMLHttpRequest.OPENED) {
                this.readyStateChange(sinon.FakeXMLHttpRequest.DONE);
                this.sendFlag = false;
            }

            this.readyState = sinon.FakeXMLHttpRequest.UNSENT;
        },

        getResponseHeader: function getResponseHeader(header) {
            if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
                return null;
            }

            if (/^Set-Cookie2?$/i.test(header)) {
                return null;
            }

            header = header.toLowerCase();

            for (var h in this.responseHeaders) {
                if (h.toLowerCase() == header) {
                    return this.responseHeaders[h];
                }
            }

            return null;
        },

        getAllResponseHeaders: function getAllResponseHeaders() {
            if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
                return "";
            }

            var headers = "";

            for (var header in this.responseHeaders) {
                if (this.responseHeaders.hasOwnProperty(header) &&
                    !/^Set-Cookie2?$/i.test(header)) {
                    headers += header + ": " + this.responseHeaders[header] + "\r\n";
                }
            }

            return headers;
        },

        setResponseBody: function setResponseBody(body) {
            if (this.readyState == FakeXMLHttpRequest.DONE) {
                throw new Error("Request done");
            }

            if (this.async && this.readyState != FakeXMLHttpRequest.HEADERS_RECEIVED) {
                throw new Error("No headers received");
            }

            var chunkSize = this.chunkSize || 10;
            var index = 0;
            this.responseText = "";

            do {
                if (this.async) {
                    this.readyStateChange(FakeXMLHttpRequest.LOADING);
                }

                this.responseText += body.substring(index, index + chunkSize);
                index += chunkSize;
            } while (index < body.length);

            var type = this.getResponseHeader("Content-Type");

            if (this.responseText &&
                (!type || /(text\/xml)|(application\/xml)|(\+xml)/.test(type))) {
                try {
                    this.responseXML = FakeXMLHttpRequest.parseXML(this.responseText);
                } catch (e) {}
            }

            if (this.async) {
                this.readyStateChange(FakeXMLHttpRequest.DONE);
            } else {
                this.readyState = FakeXMLHttpRequest.DONE;
            }
        },

        respond: function respond(status, headers, body) {
            this.setResponseHeaders(headers || {});
            this.status = typeof status == "number" ? status : 200;
            this.statusText = FakeXMLHttpRequest.statusCodes[this.status];
            this.setResponseBody(body || "");
        }
    });

    sinon.extend(FakeXMLHttpRequest, {
        UNSENT: 0,
        OPENED: 1,
        HEADERS_RECEIVED: 2,
        LOADING: 3,
        DONE: 4
    });

    // Borrowed from JSpec
    FakeXMLHttpRequest.parseXML = function parseXML(text) {
        var xmlDoc;

        if (typeof DOMParser != "undefined") {
            var parser = new DOMParser();
            xmlDoc = parser.parseFromString(text, "text/xml");
        } else {
            xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
            xmlDoc.async = "false";
            xmlDoc.loadXML(text);
        }

        return xmlDoc;
    };

    FakeXMLHttpRequest.statusCodes = {
        100: "Continue",
        101: "Switching Protocols",
        200: "OK",
        201: "Created",
        202: "Accepted",
        203: "Non-Authoritative Information",
        204: "No Content",
        205: "Reset Content",
        206: "Partial Content",
        300: "Multiple Choice",
        301: "Moved Permanently",
        302: "Found",
        303: "See Other",
        304: "Not Modified",
        305: "Use Proxy",
        307: "Temporary Redirect",
        400: "Bad Request",
        401: "Unauthorized",
        402: "Payment Required",
        403: "Forbidden",
        404: "Not Found",
        405: "Method Not Allowed",
        406: "Not Acceptable",
        407: "Proxy Authentication Required",
        408: "Request Timeout",
        409: "Conflict",
        410: "Gone",
        411: "Length Required",
        412: "Precondition Failed",
        413: "Request Entity Too Large",
        414: "Request-URI Too Long",
        415: "Unsupported Media Type",
        416: "Requested Range Not Satisfiable",
        417: "Expectation Failed",
        422: "Unprocessable Entity",
        500: "Internal Server Error",
        501: "Not Implemented",
        502: "Bad Gateway",
        503: "Service Unavailable",
        504: "Gateway Timeout",
        505: "HTTP Version Not Supported"
    };

    return FakeXMLHttpRequest;
}());

(function (global) {
    var GlobalXMLHttpRequest = global.XMLHttpRequest;
    var GlobalActiveXObject = global.ActiveXObject;
    var supportsActiveX = typeof ActiveXObject != "undefined";
    var supportsXHR = typeof XMLHttpRequest != "undefined";

    sinon.useFakeXMLHttpRequest = function () {
        sinon.FakeXMLHttpRequest.restore = function restore(keepOnCreate) {
            if (supportsXHR) {
                global.XMLHttpRequest = GlobalXMLHttpRequest;
            }

            if (supportsActiveX) {
                global.ActiveXObject = GlobalActiveXObject;
            }

            delete sinon.FakeXMLHttpRequest.restore;

            if (keepOnCreate !== true) {
                delete sinon.FakeXMLHttpRequest.onCreate;
            }
        };

        if (supportsXHR) {
            global.XMLHttpRequest = sinon.FakeXMLHttpRequest;
        }

        if (supportsActiveX) {
            global.ActiveXObject = function ActiveXObject(objId) {
                if (objId == "Microsoft.XMLHTTP" || /^Msxml2\.XMLHTTP/.test(objId)) {
                    return new sinon.FakeXMLHttpRequest();
                }

                return new GlobalActiveXObject(objId);
            };
        }

        return sinon.FakeXMLHttpRequest;
    };
}(this));

if (typeof module == "object" && typeof require == "function") {
    module.exports = sinon;
}
/*jslint eqeqeq: false, plusplus: false, evil: true, onevar: false, browser: true, forin: false*/
/*global module, require, window*/
/**
 * Fake timer API
 * setTimeout
 * setInterval
 * clearTimeout
 * clearInterval
 * tick
 * reset
 * Date
 *
 * Inspired by jsUnitMockTimeOut from JsUnit
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2011 Christian Johansen
 */
"use strict";

if (typeof sinon == "undefined") {
    var sinon = {};
}

sinon.clock = (function () {
    var id = 0;

    function addTimer(args, recurring) {
        if (args.length === 0) {
            throw new Error("Function requires at least 1 parameter");
        }

        var toId = id++;
        var delay = args[1] || 0;

        if (!this.timeouts) {
            this.timeouts = {};
        }

        this.timeouts[toId] = {
            id: toId,
            func: args[0],
            callAt: this.now + delay
        };

        if (recurring === true) {
            this.timeouts[toId].interval = delay;
        }

        return toId;
    }

    function parseTime(str) {
        if (!str) {
            return 0;
        }

        var strings = str.split(":");
        var l = strings.length, i = l;
        var ms = 0, parsed;

        if (l > 3 || !/^(\d\d:){0,2}\d\d?$/.test(str)) {
            throw new Error("tick only understands numbers and 'h:m:s'");
        }

        while (i--) {
            parsed = parseInt(strings[i], 10);

            if (parsed >= 60) {
                throw new Error("Invalid time " + str);
            }

            ms += parsed * Math.pow(60, (l - i - 1));
        }

        return ms * 1000;
    }

    function createObject(object) {
        var newObject;

        if (Object.create) {
            newObject = Object.create(object);
        } else {
            var F = function () {};
            F.prototype = object;
            newObject = new F();
        }

        newObject.Date.clock = newObject;
        return newObject;
    }

    return {
        now: 0,

        create: function create(now) {
            var clock = createObject(this);

            if (typeof now == "number") {
                this.now = now;
            }

            return clock;
        },

        setTimeout: function setTimeout(callback, timeout) {
            return addTimer.call(this, arguments, false);
        },

        clearTimeout: function clearTimeout(timerId) {
            if (!this.timeouts) {
                this.timeouts = [];
            }

            delete this.timeouts[timerId];
        },

        setInterval: function setInterval(callback, timeout) {
            return addTimer.call(this, arguments, true);
        },

        clearInterval: function clearInterval(timerId) {
            this.clearTimeout(timerId);
        },

        tick: function tick(ms) {
            ms = typeof ms == "number" ? ms : parseTime(ms);
            var tickFrom = this.now, tickTo = this.now + ms, previous = this.now;
            var timer = this.firstTimerInRange(tickFrom, tickTo);

            while (timer && tickFrom <= tickTo) {
                if (this.timeouts[timer.id]) {
                    tickFrom = this.now = timer.callAt;
                    this.callTimer(timer);
                }

                timer = this.firstTimerInRange(previous, tickTo);
                previous = tickFrom;
            }

            this.now = tickTo;
        },

        firstTimerInRange: function (from, to) {
            var timer, smallest, originalTimer;

            for (var id in this.timeouts) {
                if (this.timeouts.hasOwnProperty(id)) {
                    if (this.timeouts[id].callAt < from || this.timeouts[id].callAt > to) {
                        continue;
                    }

                    if (!smallest || this.timeouts[id].callAt < smallest) {
                        originalTimer = this.timeouts[id];
                        smallest = this.timeouts[id].callAt;
                        
                        timer = {
                            func: this.timeouts[id].func,
                            callAt: this.timeouts[id].callAt,
                            interval: this.timeouts[id].interval,
                            id: this.timeouts[id].id
                        };
                    }
                }
            }
            
            return timer || null;
        },

        callTimer: function (timer) {
            try {
                if (typeof timer.func == "function") {
                    timer.func.call(null);
                } else {
                    eval(timer.func);
                }
            } catch (e) {}

            if (!this.timeouts[timer.id]) {
                return;
            }

            if (typeof timer.interval == "number") {
                this.timeouts[timer.id].callAt += timer.interval;
            } else {
                delete this.timeouts[timer.id];
            }
        },

        reset: function reset() {
            this.timeouts = {};
        },

        Date: (function () {
            var NativeDate = Date;

            function ClockDate(year, month, date, hour, minute, second, ms) {
                // Defensive and verbose to avoid potential harm in passing
                // explicit undefined when user does not pass argument
                switch (arguments.length) {
                case 0:
                    return new NativeDate(ClockDate.clock.now);
                case 1:
                    return new NativeDate(year);
                case 2:
                    return new NativeDate(year, month);
                case 3:
                    return new NativeDate(year, month, date);
                case 4:
                    return new NativeDate(year, month, date, hour);
                case 5:
                    return new NativeDate(year, month, date, hour, minute);
                case 6:
                    return new NativeDate(year, month, date, hour, minute, second);
                default:
                    return new NativeDate(year, month, date, hour, minute, second, ms);
                }
            }

            if (NativeDate.now) {
                ClockDate.now = function now() {
                    return ClockDate.clock.now;
                };
            }

            if (NativeDate.toSource) {
                ClockDate.toSource = function toSource() {
                    return NativeDate.toSource();
                };
            }

            ClockDate.toString = function toString() {
                return NativeDate.toString();
            };

            ClockDate.prototype = NativeDate.prototype;
            ClockDate.parse = NativeDate.parse;
            ClockDate.UTC = NativeDate.UTC;

            return ClockDate;
        }())
    };
}());

sinon.timers = {
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    Date: Date
};

sinon.useFakeTimers = (function (global) {
    var methods = ["Date", "setTimeout", "setInterval", "clearTimeout", "clearInterval"];

    function restore() {
        var method;

        for (var i = 0, l = this.methods.length; i < l; i++) {
            method = this.methods[i];
            global[method] = this["_" + method];
        }
    }

    function stubGlobal(method, clock) {
        clock["_" + method] = global[method];

        global[method] = function () {
            return clock[method].apply(clock, arguments);
        };

        for (var prop in clock[method]) {
            if (clock[method].hasOwnProperty(prop)) {
                global[method][prop] = clock[method][prop];
            }
        }

        global[method].clock = clock;
    }

    return function useFakeTimers(now) {
        var clock = sinon.clock.create(now);
        clock.restore = restore;
        clock.methods = Array.prototype.slice.call(arguments,
                                                   typeof now == "number" ? 1 : 0);

        if (clock.methods.length === 0) {
            clock.methods = methods;
        }

        for (var i = 0, l = clock.methods.length; i < l; i++) {
            stubGlobal(clock.methods[i], clock);
        }

        return clock;
    };
}(typeof global != "undefined" ? global : this));

if (typeof module == "object" && typeof require == "function") {
    module.exports = sinon;
}
/**
 * @depend fake_xml_http_request.js
 */
/*jslint eqeqeq: false, onevar: false, regexp: false, plusplus: false*/
/*global module, require, window*/
/**
 * The Sinon "server" mimics a web server that receives requests from
 * sinon.FakeXMLHttpRequest and provides an API to respond to those requests,
 * both synchronously and asynchronously. To respond synchronuously, canned
 * answers have to be provided upfront.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2011 Christian Johansen
 */
"use strict";

if (typeof sinon == "undefined") {
    var sinon = {};
}

sinon.fakeServer = (function () {
    function F() {}

    function create(proto) {
        F.prototype = proto;
        return new F();
    }

    function responseArray(handler) {
        var response = handler;

        if (Object.prototype.toString.call(handler) != "[object Array]") {
            response = [200, {}, handler];
        }

        if (typeof response[2] != "string") {
            throw new TypeError("Fake server response body should be string, but was " +
                                typeof response[2]);
        }

        return response;
    }

    var wloc = window.location;
    var rCurrLoc = new RegExp("^" + wloc.protocol + "//" + wloc.host);

    function matchOne(response, reqMethod, reqUrl) {
        var rmeth = response.method;
        var matchMethod = !rmeth || rmeth.toLowerCase() == reqMethod.toLowerCase();
        var url = response.url;
        var matchUrl = !url || url == reqUrl || (typeof url.test == "function" && url.test(reqUrl));

        return matchMethod && matchUrl;
    }

    function match(response, request) {
        var requestMethod = this.getHTTPMethod(request);
        var requestUrl = request.url;

        if (!/^https?:\/\//.test(requestUrl) || rCurrLoc.test(requestUrl)) {
            requestUrl = requestUrl.replace(rCurrLoc, "");
        }

        if (matchOne(response, this.getHTTPMethod(request), requestUrl)) {
            if (typeof response.response == "function") {
                var args = [request].concat(requestUrl.match(response.url).slice(1));
                return response.response.apply(response, args);
            }

            return true;
        }

        return false;
    }

    return {
        create: function () {
            var server = create(this);
            this.xhr = sinon.useFakeXMLHttpRequest();
            server.requests = [];

            this.xhr.onCreate = function (xhrObj) {
                server.addRequest(xhrObj);
            };

            return server;
        },

        addRequest: function addRequest(xhrObj) {
            var server = this;
            this.requests.push(xhrObj);

            xhrObj.onSend = function () {
                server.handleRequest(this);
            };

            if (this.autoRespond && !this.responding) {
                setTimeout(function () {
                    server.responding = false;
                    server.respond();
                }, this.autoRespondAfter || 10);

                this.responding = true;
            }
        },

        getHTTPMethod: function getHTTPMethod(request) {
            if (this.fakeHTTPMethods && /post/i.test(request.method)) {
                var matches = request.requestBody.match(/_method=([^\b;]+)/);
                return !!matches ? matches[1] : request.method;
            }

            return request.method;
        },

        handleRequest: function handleRequest(xhr) {
            if (xhr.async) {
                if (!this.queue) {
                    this.queue = [];
                }

                this.queue.push(xhr);
            } else {
                this.processRequest(xhr);
            }
        },

        respondWith: function respondWith(method, url, body) {
            if (arguments.length == 1) {
                this.response = responseArray(method);
            } else {
                if (!this.responses) {
                    this.responses = [];
                }

                if (arguments.length == 2) {
                    body = url;
                    url = method;
                    method = null;
                }

                this.responses.push({
                    method: method,
                    url: url,
                    response: typeof body == "function" ? body : responseArray(body)
                });
            }
        },

        respond: function respond() {
            var queue = this.queue || [];
            var request;

            while(request = queue.shift()) {
                this.processRequest(request);
            }
        },

        processRequest: function processRequest(request) {
            try {
                if (request.aborted) {
                    return;
                }

                var response = this.response || [404, {}, ""];

                if (this.responses) {
                    for (var i = 0, l = this.responses.length; i < l; i++) {
                        if (match.call(this, this.responses[i], request)) {
                            response = this.responses[i].response;
                            break;
                        }
                    }
                }

                if (request.readyState != 4) {
                    request.respond(response[0], response[1], response[2]);
                }
            } catch (e) {}
        },

        restore: function restore() {
            return this.xhr.restore && this.xhr.restore.apply(this.xhr, arguments);
        }
    };
}());

if (typeof module == "object" && typeof require == "function") {
    module.exports = sinon;
}
/**
 * @depend fake_server.js
 * @depend fake_timers.js
 */
/*jslint browser: true, eqeqeq: false, onevar: false*/
/*global sinon*/
/**
 * Add-on for sinon.fakeServer that automatically handles a fake timer along with
 * the FakeXMLHttpRequest. The direct inspiration for this add-on is jQuery
 * 1.3.x, which does not use xhr object's onreadystatehandler at all - instead,
 * it polls the object for completion with setInterval. Dispite the direct
 * motivation, there is nothing jQuery-specific in this file, so it can be used
 * in any environment where the ajax implementation depends on setInterval or
 * setTimeout.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2011 Christian Johansen
 */
"use strict";

(function () {
    function Server() {}
    Server.prototype = sinon.fakeServer;

    sinon.fakeServerWithClock = new Server();

    sinon.fakeServerWithClock.addRequest = function addRequest(xhr) {
        if (xhr.async) {
            if (typeof setTimeout.clock == "object") {
                this.clock = setTimeout.clock;
            } else {
                this.clock = sinon.useFakeTimers();
                this.resetClock = true;
            }

            if (!this.longestTimeout) {
                var clockSetTimeout = this.clock.setTimeout;
                var clockSetInterval = this.clock.setInterval;
                var server = this;

                this.clock.setTimeout = function (fn, timeout) {
                    server.longestTimeout = Math.max(timeout, server.longestTimeout || 0);

                    return clockSetTimeout.apply(this, arguments);
                };

                this.clock.setInterval = function (fn, timeout) {
                    server.longestTimeout = Math.max(timeout, server.longestTimeout || 0);

                    return clockSetInterval.apply(this, arguments);
                };
            }
        }

        return sinon.fakeServer.addRequest.call(this, xhr);
    };

    sinon.fakeServerWithClock.respond = function respond() {
        var returnVal = sinon.fakeServer.respond.apply(this, arguments);

        if (this.clock) {
            this.clock.tick(this.longestTimeout || 0);
            this.longestTimeout = 0;

            if (this.resetClock) {
                this.clock.restore();
                this.resetClock = false;
            }
        }

        return returnVal;
    };

    sinon.fakeServerWithClock.restore = function restore() {
        if (this.clock) {
            this.clock.restore();
        }

        return sinon.fakeServer.restore.apply(this, arguments);
    };
}());
var buster = buster || {};

if (typeof require != "undefined") {
    buster = require("buster-core");
}

(function (B) {
    var current = [];
    B.spec = {};

    if (typeof module != "undefined") {
        module.exports = B.spec;
    }

    function supportRequirement(property) {
        return function (requirements) {
            return {
                describe: function () {
                    var context = B.spec.describe.apply(B.spec, arguments);
                    context[property] = requirements;
                    return context;
                }
            };
        };
    }

    B.spec.ifAllSupported = supportRequirement("requiresSupportForAll");
    B.spec.ifAnySupported = supportRequirement("requiresSupportForAny");
    B.spec.ifSupported = B.spec.ifAllSupported;

    B.spec.describe = function (name, spec) {
        if (current.length > 0) {
            var currCtx = current[current.length - 1];
            var ctx = B.spec.describe.context.create(name, spec, currCtx);
            currCtx.contexts.push(ctx.parse());
            return ctx;
        }

        var context = buster.extend(B.spec.describe.context.create(name, spec));
        context.parse();

        if (B.spec.describe.onCreate) {
            B.spec.describe.onCreate(context);
        }

        return context;
    };

    buster.extend(B.spec.describe, buster.eventEmitter);

    B.spec.should = function (name, func) {
        var context = current[current.length - 1];

        var spec = {
            name: "should " + name,
            func: func,
            context: context
        };

        context.tests.push(spec);
        return spec;
    };

    B.spec.shouldEventually = function (name, func) {
        var spec = B.spec.should(name, func);
        spec.deferred = true;

        return spec;
    };

    B.spec.before = function (func) {
        var context = current[current.length - 1];
        context.setUp = func;
    };

    B.spec.after = function (func) {
        var context = current[current.length - 1];
        context.tearDown = func;
    };

    B.spec.describe.context = {
        create: function (name, spec, parent) {
            if (!name || typeof name != "string") {
                throw new Error("Spec name required");
            }

            if (!spec || typeof spec != "function") {
                throw new Error("spec should be a function");
            }

            var context = buster.create(this);
            context.name = name;
            context.parent = parent;
            context.spec = spec;

            return context;
        },

        parse: function () {
            if (!this.spec) {
                return;
            }

            this.testCase = {
                before: B.spec.before,
                after: B.spec.after,
                should: B.spec.should,
                shouldEventually: B.spec.shouldEventually,
                describe: B.spec.describe
            };

            this.tests = [];
            current.push(this);
            this.contexts = [];
            this.spec.call(this.testCase);
            current.pop();
            delete this.spec;

            return this;
        }
    };

    var g = typeof global != "undefined" && global || this;

    B.spec.expose = function (env) {
        env = env || g;
        env.describe = B.spec.describe;
        env.should = B.spec.should;
        env.before = B.spec.before;
        env.after = B.spec.after;
        env.shouldEventually = B.spec.shouldEventually;
    };
}(buster));
var buster = buster || {};

if (typeof require != "undefined") {
    buster = require("buster-core");
}

(function (B) {
    var testCase = B.testCase = function (name, tests, opt) {
        if (!name || typeof name != "string") {
            throw new Error("Test case name required");
        }

        if (!tests || typeof tests != "object") {
            throw new Error("Tests should be an object");
        }

        var context = buster.extend(testCase.context.create(name, tests), opt || {});
        context.parse();

        if (typeof B.testCase.onCreate == "function") {
            B.testCase.onCreate(context);
        }

        return context;
    };

    if (typeof module != "undefined") {
        module.exports = B.testCase;
    }

    B.extend(testCase, B.eventEmitter);

    function nonTestNames(context) {
        if (!context.nonTestNames) {
            var keys = ["setUp", "contextSetUp", "tearDown", "contextTearDown"];
            context.nonTestNames = {};

            for (var i = 0, l = keys.length; i < l; ++i) {
                context.nonTestNames[context[keys[i] + "Name"]] = true;
            }
        }

        return context.nonTestNames;
    }

    testCase.context = {
        contextSetUpName: "contextSetUp",
        setUpName: "setUp",
        tearDownName: "tearDown",
        contextTearDownName: "contextTearDown",

        create: function (name, tests, parent) {
            var context = B.create(this);
            context.name = name;
            context.content = tests;
            context.parent = parent;
            context.testCase = {};

            return context;
        },

        parse: function () {
            this.getSupportRequirements();
            this.tests = this.getTests();
            this.contexts = this.getContexts();
            this.setUp = this.getSetUp();
            this.tearDown = this.getTearDown();
            this.contextSetUp = this.getContextSetUp();
            this.contextTearDown = this.getContextTearDown();
            return this;
        },

        getSupportRequirements: function () {
            this.requiresSupportForAll = this.content.requiresSupportForAll || this.content.requiresSupportFor;
            delete this.content.requiresSupportForAll;
            delete this.content.requiresSupportFor;
            this.requiresSupportForAny = this.content.requiresSupportForAny;
            delete this.content.requiresSupportForAny;
        },

        getTests: function () {
            var tests = [];

            for (var prop in this.content) {
                if (this.isTest(prop)) {
                    tests.push({
                        name: prop.replace(/^\s*\/\/\s*/, ""),
                        func: this.content[prop],
                        context: this,
                        deferred: /^\s*\/\//.test(prop)
                    });
                }
            }

            return tests;
        },

        getContexts: function () {
            var contexts = [], ctx;

            for (var prop in this.content) {
                if (this.isContext(prop)) {
                    ctx = testCase.context.create(prop, this.content[prop], this);
                    ctx.contextSetUpName = this.contextSetUpName;
                    ctx.setUpName = this.setUpName;
                    ctx.contextTearDownName = this.contextTearDownName;
                    ctx.tearDownName = this.tearDownName;
                    contexts.push(ctx.parse());
                }
            }

            return contexts;
        },

        getSetUp: function () {
            return this.content[this.setUpName];
        },

        getContextSetUp: function () {
            return this.content[this.contextSetUpName];
        },

        getTearDown: function () {
            return this.content[this.tearDownName];
        },

        getContextTearDown: function () {
            return this.content[this.contextTearDownName];
        },

        isTest: function (prop) {
            return this.content.hasOwnProperty(prop) &&
                typeof this.content[prop] == "function" &&
                !nonTestNames(this)[prop];
        },

        isContext: function (prop) {
            return this.content.hasOwnProperty(prop) &&
                typeof this.content[prop] == "object" &&
                !!this.content[prop];
        }
    };
}(buster));
var buster = buster || {};

if (typeof require != "undefined") {
    buster = require("buster-core");
}

buster.testContextFilter = function (context, filter, name) {
    var filtered = buster.extend({}, context, {
        tests: [],
        contexts: []
    });

    filter = typeof filter == "string" ? new RegExp(filter, "i") : filter;
    name = (name || "") + context.name + " ";

    for (var i = 0, l = (context.tests || []).length; i < l; ++i) {
        if (!filter || filter.test(name + context.tests[i].name)) {
            filtered.tests.push(context.tests[i]);
        }
    }

    var ctx, contexts = context.contexts || [];

    for (i = 0, l = contexts.length; i < l; ++i) {
        ctx = buster.testContextFilter(contexts[i], filter, name);

        if (ctx.tests.length > 0 || ctx.contexts.length > 0) {
            filtered.contexts.push(ctx);
        }
    }

    return filtered;
};

if (typeof module != "undefined") {
    module.exports = buster.testContextFilter;
}
var buster = buster || {};

if (typeof require != "undefined") {
    buster = require("buster-core");
    buster.promise = require("buster-promise");
}

(function (B) {
    var thenable = buster.promise.thenable;
    var sequential = buster.promise.sequential;
    var __uid = 0;

    function uid(object) {
        if (!object.__uid) {
            object.__uid = __uid++;
        }

        return object.__uid;
    }

    function processAll(opt, method, items) {
        var i = 0, args = Array.prototype.slice.call(arguments, 3);
        var runner = this;
        items = items || [];

        var itemPromiseReturners = [];
        for (var i = 0, ii = items.length; i < ii; i++) {
            (function (i) {
                var item = items[i];
                itemPromiseReturners.push(function () {
                    return runner[method].apply(runner, [item].concat(args));
                });
            }(i));
        }

        return sequential(itemPromiseReturners);
    }

    function all() {
        var args = Array.prototype.slice.call(arguments);
        return processAll.apply(this, [{ error: function () {} }].concat(args));
    }

    function noisyAll() {
        var args = Array.prototype.slice.call(arguments);
        return processAll.apply(this, [null].concat(args));
    }

    function asyncFunction(func, thisObj) {
        var promise, arg;

        if (func.length == 1) {
            promise = buster.promise.create();

            arg = function (callback) {
                var error;

                if (callback) {
                    try {
                        callback();
                    } catch (e) {
                        error = e;
                    }
                }

                try {
                    if (error) {
                        promise.reject(error);
                    } else {
                        promise.resolve();
                    }
                } catch (e2) {}
            };
        }

        return func.call(thisObj, arg) || promise;
    }

    function getAll(context, getter, appendMethod) {
        var funcs = [];

        while (context) {
            if (typeof context[getter] == "function") {
                funcs[appendMethod](context[getter]);
            }

            context = context.parent;
        }

        return funcs;
    }

    function getResults(runner) {
        if (!runner.results) {
            runner.results = {
                contexts: 0,
                tests: 0,
                errors: 0,
                failures: 0,
                assertions: 0,
                timeouts: 0,
                deferred: 0
            };
        }

        return runner.results;
    }

    function fireOnCreate(instance, runner) {
        var callbacks = instance.callbacks || [];

        for (var i = 0, l = callbacks.length; i < l; ++i) {
            callbacks[i](runner);
        }
    }

    var exceptionListener = {};
    var windowListener;

    function uncaughtListener(err) {
        if (typeof exceptionListener.listener == "function") {
            exceptionListener.listener(err);
            return false;
        }

        return true;
    }

    function catchUncaughtExceptions(listener) {
        if (typeof process != "undefined" && !exceptionListener.listener) {
            process.on("uncaughtException", uncaughtListener);
        }

        if (typeof window != "undefined" && !exceptionListener.listener) {
            windowListener = window.onerror;
            window.onerror = function (message) {
                var name = /(AssertionError)|(\[assert)/.test(message) ?
                    "AssertionError" : "UncaughtError";

                return uncaughtListener({ name: name, message: message });
            };
        }

        exceptionListener.listener = listener;
    }

    function releaseUncaughtExceptions() {
        if (typeof process != "undefined") {
            process.removeListener("uncaughtException", uncaughtListener);
        }

        if (typeof window != "undefined") {
            window.onerror = windowListener;
        }

        delete exceptionListener.listener;
    }

    B.testRunner = B.extend(B.create(B.eventEmitter), {
        failOnNoAssertions: true,
        timeout: 250,
        handleUncaughtExceptions: true,

        create: function (opt) {
            opt = opt || {};
            var runner = buster.create(this);

            if (typeof opt.timeout == "number") {
                runner.timeout = opt.timeout;
            }

            if (typeof opt.failOnNoAssertions == "boolean") {
                runner.failOnNoAssertions = opt.failOnNoAssertions;
            }

            if (typeof opt.handleUncaughtExceptions == "boolean") {
                runner.handleUncaughtExceptions = opt.handleUncaughtExceptions;
            }

            if (!runner.handleUncaughtExceptions) {
                releaseUncaughtExceptions();
            }

            fireOnCreate(this, runner);

            return runner;
        },

        onCreate: function (callback) {
            this.callbacks = this.callbacks || [];

            if (typeof callback == "function") {
                this.callbacks.push(callback);
            } else {
                throw new TypeError("onCreate callback " + callback + " is not a function");
            }
        },

        runSuite: function (contexts) {
            this.emit("suite:start");
            var self = this, i = 0;
            var results = getResults(this);
            var promise = buster.promise.create();

            var contextPromiseReturners = [];
            for (var i = 0, ii = contexts.length; i < ii; i++) {
                (function (i) {
                    contextPromiseReturners.push(function () {
                        results.contexts += 1;
                        return self.run(contexts[i]);
                    });
                }(i));
            }

            sequential(contextPromiseReturners).then(function () {
                results.ok = results.errors == 0 && results.failures == 0 &&
                    results.timeouts == 0;

                if (self.failOnNoAssertions && results.assertions == 0) {
                    results.ok = false;
                }

                self.emit("suite:end", results);
                releaseUncaughtExceptions();
                promise.resolve(results);
            });

            return promise;
        },

        run: function (context) {
            var promise = buster.promise.create();
            if (!context) return promise.reject();
            var failed = this.failedRequirements(context);

            if (failed) {
                this.failSupportRequirements(context, failed);
                return promise.resolve();
            }

            this.emit("context:start", context);
            var self = this;
            this.errors = {};

            if (this.handleUncaughtExceptions) {
                catchUncaughtExceptions(function (err) {
                    if (err.name == "AssertionError") {
                        self.error(err, self.currentTest);
                    } else {
                        self.emit("uncaughtException", err);
                    }
                });
            }

            var setUps = getAll(context, "setUp", "unshift");
            var tearDowns = getAll(context, "tearDown", "push");
            var testCase = context.testCase;

            sequential([
                B.bind(this, all, "runTest", context.tests, setUps, tearDowns, testCase),
                B.bind(this, all, "run", context.contexts)
            ]).then(function () {
                self.emit("context:end", context);
                promise.resolve();
            });

            return promise;
        },

        runTest: function (test, setUps, tearDowns, testCase) {
            if (test.deferred) {
                return this.deferTest(test);
            }

            this.currentTest = test;
            var self = this, results = getResults(this);
            var promise = buster.promise.create();
            testCase = B.create(testCase);

            function cleanUp(err) {
                function done(err2) {
                    var assertions = self.assertionCount();
                    var error = err || err2 || self.verifyAssertionCount(testCase);
                    delete testCase.expectedAssertions;

                    if (!error && !self.errors[uid(test)]) {
                        if (!test.timeout) {
                            results.assertions += assertions;

                            self.emit("test:success", {
                                name: test.name,
                                assertions: assertions
                            });
                        }
                    } else {
                        self.error(error, test);
                    }

                    delete self.currentTest;
                    results.tests += 1;
                    promise.resolve();
                }

                self.runTearDowns(tearDowns, test, testCase).then(done, done);
            }

            sequential([
                B.bind(this, "runSetUps", setUps, test, testCase),
                B.bind(this, "emit", "test:start", { name: test.name, testCase: testCase }),
                B.bind(this, "runTestFunction", test, testCase)
            ]).then(cleanUp, cleanUp);

            return promise;
        },

        runTestFunction: function (test, testCase) {
            var result = asyncFunction(test.func, testCase);

            if (result && result.then) {
                if (!test.asyncEmitted && !this.errors[uid(test)]) {
                    this.emit("test:async", { name: test.name });
                    test.asyncEmitted = true;
                }

                this.timebox(test, result);
            }

            return thenable(result);
        },

        runSetUps: function (setUps, test, testCase) {
            this.emit("test:setUp", { name: test.name, testCase: testCase });
            return noisyAll.call(this, "runSetUp", setUps, test, testCase);
        },

        runSetUp: function (setUp, test, testCase) {
            var promise = this.timebox(test, asyncFunction(setUp, testCase));

            if (promise && !test.asyncEmitted) {
                test.asyncEmitted = true;
                this.emit("test:async", { name: test.name });
            }

            return promise;
        },

        runTearDowns: function (tearDowns, test, testCase) {
            this.emit("test:tearDown", { name: test.name, testCase: testCase });
            return noisyAll.call(this, "runTearDown", tearDowns, test, testCase);
        },

        runTearDown: function (tearDown, test, testCase) {
            var promise = this.timebox(test, asyncFunction(tearDown, testCase));

            if (promise && !test.asyncEmitted && !this.errors[uid(test)]) {
                this.emit("test:async", { name: test.name });
            }

            return promise;
        },

        timebox: function (test, promise) {
            if (!promise) {
                return;
            }

            var self = this;

            var timer = setTimeout(function () {
                try {
                    promise.resolve();

                    if (!self.errors[uid(test)]) {
                        self.emit("test:timeout", { name: test.name });
                        test.timeout = true;
                        getResults(self).timeouts += 1;
                    }
                } catch (e) {}
            }, this.timeout);

            promise.then(function () {
                clearTimeout(timer);
            });

            return promise;
        },

        deferTest: function (test) {
            this.emit("test:deferred", test);
            getResults(this).deferred += 1;
        },

        error: function (error, test) {
            if (!test) {
                return;
            }

            if (this.errors[uid(test)]) {
                return;
            }

            this.errors[uid(test)] = true;

            var data = {
                name: test.name,
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                }
            };

            var results = getResults(this);

            if (error.name == "AssertionError") {
                results.failures += 1;
                this.emit("test:failure", data);
            } else {
                results.errors += 1;
                this.emit("test:error", data);
            }
        },

        assertionCount: function () {},

        assertionFailure: function (error) {
            this.error(error, this.currentTest);
        },

        verifyAssertionCount: function (testCase) {
            var message, assertions = this.assertionCount();
            var expected = testCase.expectedAssertions;

            if (this.failOnNoAssertions && assertions == 0) {
                message = "No assertions!";
            }

            if (expected && assertions != expected) {
                message = "Expected " + expected + " assertions, ran " + assertions;
            }

            if (message) {
                try {
                    var error = new Error(message);
                    error.name = "AssertionError";
                    throw error;
                } catch (e) {
                    return e;
                }
            }
        },

        failedRequirements: function (context) {
            var support = context.requiresSupportForAll ||
                context.requiresSupportForAny;

            if (!support) return null;
            var requireAll = support == context.requiresSupportForAll;
            var requirements = [];

            for (var prop in support) {
                var req = support[prop];
                var supported = !(!req || (typeof req == "function" && !req()));

                if (requireAll && !supported) return [prop];
                if (!requireAll && supported) return null;
                requirements.push(prop);
            }

            return requireAll ? null : requirements;
        },

        failSupportRequirements: function (context, requirements) {
            this.emit("context:unsupported", {
                context: context,
                unsupported: requirements
            });
        }
    });
}(buster));

if (typeof module != "undefined") {
    module.exports = buster.testRunner
}
if (typeof require != "undefined") {
    var buster = require("buster-core");
}

(function () {
    function proxyName(event) {
        return function (arg) {
            this.emit(event, { name: arg.name });
        };
    }

    function proxyNameAndError(event) {
        return function (test) {
            this.emit(event, {
                name: test.name,
                error: {
                    name: test.error.name,
                    message: test.error.message,
                    stack: test.error.stack
                }
            });
        }
    }

    buster.reporters = buster.reporters || {};

    buster.reporters.jsonProxy = buster.extend(buster.create(buster.eventEmitter), {
        create: function (emitter) {
            var proxy = buster.create(this);

            if (emitter) {
                proxy.on = buster.bind(emitter, "on");
                proxy.emit = buster.bind(emitter, "emit");
                proxy.addListener = buster.bind(emitter, "addListener");
                proxy.hasListener = buster.bind(emitter, "hasListener");
            }

            return proxy;
        },

        listen: function (runner) {
            runner.bind(this, {
                "context:start": "contextStart", "context:end": "contextEnd",
                "context:unsupported": "contextUnsupported",
                "test:setUp": "testSetUp", "test:tearDown": "testTearDown",
                "test:start": "testStart", "test:error": "testError",
                "test:failure": "testFailure", "test:success": "testSuccess",
                "test:deferred": "testDeferred", "suite:end": "suiteEnd",
                "suite:start": "suiteStart", "uncaughtException": "uncaughtException"
            });

            return this;
        },

        suiteStart: function () {
            this.emit("suite:start");
        },

        contextStart: proxyName("context:start"),
        contextEnd: proxyName("context:end"),
        testSetUp: proxyName("test:setUp"),
        testTearDown: proxyName("test:tearDown"),
        testStart: proxyName("test:start"),
        testDeferred: proxyName("test:deferred"),
        testError: proxyNameAndError("test:error"),
        testFailure: proxyNameAndError("test:failure"),

        contextUnsupported: function (data) {
            this.emit("context:unsupported", {
                context: { name: data.context.name },
                unsupported: data.unsupported
            });
        },

        uncaughtException: function (error) {
            this.emit("uncaughtException", {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
        },

        testSuccess: function (test) {
            this.emit("test:success", {
                name: test.name,
                assertions: test.assertions
            });
        },

        suiteEnd: function (stats) {
            this.emit("suite:end", {
                contexts: stats.contexts,
                tests: stats.tests,
                errors: stats.errors,
                failures: stats.failures,
                assertions: stats.assertions,
                timeouts: stats.timeouts,
                deferred: stats.deferred,
                ok: stats.ok
            });
        },

        log: function (msg) {
            this.emit("log", msg);
        }
    });
}());

if (typeof module != "undefined") {
    module.exports = buster.reporters.jsonProxy;
}
/*jslint onevar: false, eqeqeq: false*/
/*global require*/
if (typeof require != "undefined") {
    var sinon = require("sinon");

    var buster = {
        assertions: require("buster-assertions"),
        format: require("buster-format"),
        testRunner: require("buster-test").testRunner,
        stackFilter: require("buster-test").stackFilter
    };
}

if (buster.stackFilter && buster.stackFilter.filters) {
    buster.stackFilter.filters.push("lib/sinon");
}

buster.testRunner.onCreate(function (runner) {
    runner.on("test:setUp", function (test) {
        var config = sinon.getConfig(sinon.config);
        config.useFakeServer = false;
        var sandbox = sinon.sandbox.create();
        sandbox.inject(test.testCase);

        test.testCase.useFakeTimers = function () {
            return sandbox.useFakeTimers.apply(sandbox, arguments);
        };

        test.testCase.sandbox = sandbox;
        var testFunc = test.func;
    });

    runner.on("test:tearDown", function (test) {
        try {
            test.testCase.sandbox.verifyAndRestore();
        } catch (e) {
            runner.error(e, test);
        }
    });
});

for (var prop in sinon.assert) {
    if (typeof sinon.assert[prop] == "function" && prop != "fail" && prop != "pass") {
        buster.assertions.assert[prop] = sinon.assert[prop];
    }
}

sinon.format = buster.format.ascii;

sinon.assert.fail = function () {
    buster.assertions.fail.apply(buster.assertions, arguments);
};

sinon.assert.pass = function (assertion) {
    buster.assertions.emit("pass", assertion);
};
if (typeof require != "undefined") {
    var buster = require("buster-core");

    module.exports = buster.extend(buster, require("buster-test"), {
        assertions: require("buster-assertions"),
        format: require("buster-format"),
        eventedLogger: require("buster-evented-logger")
    });

    buster.defineVersionGetter(module.exports, __dirname);
    require("sinon-buster");
}

(function () {
    var logFormatter = buster.create(buster.format);
    logFormatter.quoteStrings = false;
    var asciiFormat = buster.bind(logFormatter, "ascii");
    buster.console = buster.eventedLogger.create({ formatter: asciiFormat });
    buster.log = buster.bind(buster.console, "log");
    buster.assertions.format = buster.format.ascii;
    buster.assert = buster.assertions.assert;
    buster.refute = buster.assertions.refute;

    // Assertion counting
    var assertions = 0;

    buster.assertions.on("pass", function () {
        assertions += 1;
    });

    buster.testRunner.onCreate(function (runner) {
        buster.assertions.bind(runner, { "failure": "assertionFailure" });
        buster.assertions.throwOnFailure = false;

        runner.on("test:start", function () {
            assertions = 0;
        });
    });

    buster.testRunner.assertionCount = function () {
        return assertions;
    };
}());
