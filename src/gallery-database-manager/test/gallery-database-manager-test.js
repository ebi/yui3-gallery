var assert = buster.assert;

YUI({ base: '/HULLA'}).use('gallery-database-manager', function (Y) {

	function getDB () {
		return (new Y.DatabaseManager({
			dbDisabledPropertyName: 'unitTest' + Date.now()
		}));
	}

	var allBrowsers = {
		"allowsDBAccessByCookie": function () {
			assert.isTrue(this.db._allowsDBAccessByCookie());
		}
	};

	var allFeatures = buster.testCase("Gallery Database Manager Tests with localStorage and Database", {
		requiresSupportFor: {
			'localStorage': !!localStorage.getItem,
			'noDatabase': !!window.openDatabase
		},

		setUp: function () {
			//Initialize the DB and set the access to true
			this.db = getDB();
		},

		"Access is enabled by default": function () {
			assert.isTrue(this.db.get('allowsAccess'));
		}
	});

	var noDB = buster.testCase("Gallery Database Manager Tests with localStorage but no Database", {
		requiresSupportFor: {
			'localStorage': !!localStorage.getItem,
			'noDatabase': !window.openDatabase
		},

		setUp: function () {
			//Initialize the DB and set the access to true
			this.db = getDB();
		},

		"Access is disabled by default": function () {
			assert.isFalse(this.db.get('allowsAccess'));
		}
	});

	Y.mix(allFeatures, allBrowsers);
	Y.mix(noDB, allBrowsers);
});
