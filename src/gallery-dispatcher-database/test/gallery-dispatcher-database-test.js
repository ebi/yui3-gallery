
YUI({ base: '/HULLA'}).use('gallery-dispatcher-database', function (Y) {
	//Shorthands
	var assert = buster.assert,
		disdb = Y.Dispatcher.database,

	//Constants from gallery-dispatcher-database
		ATTR_STORE = 'storeResponse',
		ATTR_DB = 'databaseManager';


	var allBrowsers = {
		setUp: function () {
		}
	};

	var allFeatures = {
		requiresSupportFor: {
			'database': !!window.openDatabase
		},

		"Initializer binds event": function () {
			var hostStub = this.stub(disdb.prototype, 'onHostEvent');

			(new disdb({databaseManager: this.stub()}));

			assert.calledOnce(hostStub);
		},

		"Initializer creats a new DBM": function () {
			var hostStub = this.stub(disdb.prototype, 'onHostEvent'),
				setStub = this.stub(disdb.prototype, 'set'),
				dbmStub = this.stub(Y, 'DatabaseManager');

			(new disdb());

			assert.calledOnce(hostStub);
			assert.calledTwice(setStub); //One call comes from the initializer
			assert.calledOnce(dbmStub);
			assert.isTrue(dbmStub.calledWithNew());
			assert.calledWithExactly(setStub, ATTR_DB, new dbmStub());
		}
	};

	var noDB =  {
		requiresSupportFor: {
			'noDatabase': !window.openDatabase
		},

		"Initializer does nothing": function () {
			var hostStub = this.stub(disdb.prototype, 'onHostEvent');

			(new disdb());

			assert.notCalled(hostStub);
		}
	};

	Y.mix(allFeatures, allBrowsers);
	Y.mix(noDB, allBrowsers);
	buster.testCase("Gallery Database Manager Tests with localStorage but no Database", noDB);
	buster.testCase("Gallery Database Manager Tests with localStorage and Database", allFeatures);
});
