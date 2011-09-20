var assert = buster.assert;

YUI({ base: '/HULLA'}).use('gallery-database-manager', function (Y) {
	buster.testCase("Gallery Database Manager Tests", {
		setUp: function () {
			this.dbm = new Y.DatabaseManager();
		},

		"allowsDBAccessByCookie": function () {
			assert.isTrue(this.dbm._allowsDBAccessByCookie());
		}
	});
});
