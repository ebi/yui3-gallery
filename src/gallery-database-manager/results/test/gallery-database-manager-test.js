var assert = buster.assert;

YUI({base: '../../../yui3/build/'}).use('gallery-database-manager', function (Y) {
    buster.testCase("Gallery Database Manager Tests", {
        setUp: function () {
            this.dbm = new Y.DatabaseManager();
        },

        "test that no cookie is set": function () {
            assert.isTrue(this.db._allowsDBAccessByCookie());
        }
    });
});
