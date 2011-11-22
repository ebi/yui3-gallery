var config = exports;

config['Browser tests'] = {
	environment: 'browser',
	sources: [
		'test/yui3/yui/yui-min.js',
		'test/yui3/intl/intl-min.js',
		'test/yui3/cookie/cookie-min.js',
		'test/yui3/oop/oop-min.js',
		'test/yui3/event-custom-base/event-custom-base-min.js',
		'test/yui3/event-custom-complex/event-custom-complex-min.js',
		'test/yui3/attribute-base/attribute-base-min.js',
		'test/yui3/base-base/base-base-min.js',
		'test/yui3/plugin/plugin-min.js',
		'test/yui3/pluginhost-base/pluginhost-base-min.js',
		'test/yui3/pluginhost-config/pluginhost-config-min.js',
		'test/yui3/base-pluginhost/base-pluginhost-min.js',
		'test/yui3/base-build/base-build-min.js',
		'test/yui3/io-base/io-base-min.js',
		'test/yui3/querystring-stringify-simple/querystring-stringify-simple-min.js',
		'test/yui3/dom-core/dom-core-min.js',
		'test/yui3/dom-base/dom-base-min.js',
		'test/yui3/selector-native/selector-native-min.js',
		'test/yui3/selector/selector-min.js',
		'test/yui3/node-core/node-core-min.js',
		'test/yui3/node-base/node-base-min.js',
		'test/yui3/event-base/event-base-min.js',
		'test/yui3/async-queue/async-queue-min.js',
		'test/yui3/classnamemanager/classnamemanager-min.js',
		'test/gallery/gallery-dispatcher/gallery-dispatcher-min.js',
		'test/gallery/gallery-database-manager/gallery-database-manager-min.js',
		'build_tmp/gallery-dispatcher-database-debug.js'
	],
	tests: ['test/*-test.js']
};
