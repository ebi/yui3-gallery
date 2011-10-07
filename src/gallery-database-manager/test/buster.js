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
		'test/yui3/pluginhost-base/pluginhost-base-min.js',
		'test/yui3/pluginhost-config/pluginhost-config-min.js',
		'test/yui3/base-pluginhost/base-pluginhost-min.js',
		'test/yui3/base-build/base-build-min.js',
		'build_tmp/gallery-database-manager-debug.js'
	],
	tests: ['test/*-test.js']
};
