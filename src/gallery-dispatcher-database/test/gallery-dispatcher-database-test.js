
YUI({ base: '/HULLA'}).use('gallery-dispatcher-database', function (Y) {
	//Shorthands
	var assert = buster.assert,
		disdb = Y.Dispatcher.database,
		URL = 'someUrl',
		RESPONSE = {
			responseText: 'someResponse'
		},
		HOST = 'host',
		CONTENT = 'content',

	//Constants from gallery-dispatcher-database
		ATTR_STORE = 'storeResponse',
		ATTR_DB = 'databaseManager';


	var allBrowsers = {
		setUp: function () {
			this.stub(disdb.prototype, 'initializer');
			this.dbm = this.stub();
			this.dbm.setItem = this.stub();
			this.disdb = new disdb({ databaseManager: this.dbm });
		},

		"_storeContent": {
			setUp: function () {
				this.host = {
					set: this.stub()
				};
				this.disdb.set(HOST, this.host);
			},

			"sets an item if store is true": function () {
				this.disdb._storeContent(666, RESPONSE, {url: URL});

				assert.calledOnce(this.dbm.setItem);
				assert.calledWithExactly(this.dbm.setItem, URL, RESPONSE.responseText);
				assert.calledOnce(this.host.set);
				assert.calledWithExactly(this.host.set, CONTENT, RESPONSE.responseText);
				
			},

			"passes to the host doesn't store": function () {
				this.disdb.set(ATTR_STORE, false);
				this.disdb._storeContent(666, RESPONSE, {url: URL});

				assert.notCalled(this.dbm.setItem);
				assert.calledOnce(this.host.set);
				assert.calledWithExactly(this.host.set, CONTENT, RESPONSE.responseText);
			}
		}
	};

	var allFeatures = {
		requiresSupportFor: {
			'database': !!window.openDatabase
		},

		initializer: {
			setUp: function () {
				disdb.prototype.initializer.restore();
			},

			"binds event": function () {
				var hostStub = this.stub(disdb.prototype, 'onHostEvent');

				(new disdb({databaseManager: this.stub()}));

				assert.calledOnce(hostStub);
			},

			"creats a new DBM": function () {
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
