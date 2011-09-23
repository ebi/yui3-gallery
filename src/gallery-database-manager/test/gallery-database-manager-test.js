
YUI({ base: '/HULLA'}).use('gallery-database-manager', function (Y) {
	//Shorthands
	var assert = buster.assert,

	//Constants from DBM
		DBTABLE = 'yuiGalleryKeyValueStore',

	//Constants
		SOMEKEY = 'someKey',
		SOMEVALUE = 'someValue',
		SOMEFLAG = 5,
		SOMEHASH = 'hullahulla',
		LIFETIME = 0,
		TIMEWRITTEN = 1234567890,
		TESTDBVERS = '',
		CUSTOMFIELDS = [
			{
				name: 'flag',
				type: 'INTEGER'
			},
			{
				name: 'hash',
				type: 'TEXT'
			}
		],
		CUSTOMVALUE = [SOMEVALUE, SOMEFLAG, SOMEHASH];



	function getDB (config) {
		var defaults = {
			databaseName: 'unitTestDB' + Date.now(),
			dbDisabledPropertyName: 'unitTest' + Date.now()
		};
		config = Y.mix(defaults, config, true);
		return (new Y.DatabaseManager(config));
	}

	var allBrowsers = {
		setUp: function () {
			this.txStub = {
				executeSql: this.stub()
			};
			this.getDBStub = this.stub(Y.DatabaseManager.prototype, '_getDatabase').returns({
				version: TESTDBVERS,
				changeVersion: this.stub().callsArgWith(2, this.txStub),
				transaction: this.stub().callsArgWith(0, this.txStub)
			});
			this.stub(Y.DatabaseManager.prototype, '_allowsDBAccess').returns(true);
			this.stub(Y.DatabaseManager.prototype, '_getNow').returns(TIMEWRITTEN);
		},

		"allowsDBAccessByCookie": function () {
			var db = getDB();
			assert.isTrue(db._allowsDBAccessByCookie());
		},

		"initializer": {
			"create the default db": function () {
				var db = getDB(),
					dbHandle = db.get('dbHandle');

				assert.calledOnce(this.getDBStub);
				assert.calledOnce(dbHandle.changeVersion);
				assert.calledWith(dbHandle.changeVersion, TESTDBVERS, '1');

				assert.calledOnce(this.txStub.executeSql);
				assert.calledWithExactly(this.txStub.executeSql, 'CREATE TABLE ' + DBTABLE + ' (id TEXT PRIMARY KEY, value BLOB, timeWritten INTEGER, lifetime INTEGER);');
			},

			"create the db with custom fields": function () {
				var db = getDB({
					customFields: CUSTOMFIELDS
				});

				assert.calledOnce(this.txStub.executeSql);
				assert.calledWithExactly(this.txStub.executeSql, 'CREATE TABLE ' + DBTABLE + ' (id TEXT PRIMARY KEY, value BLOB, flag INTEGER, hash TEXT, timeWritten INTEGER, lifetime INTEGER);');
			},

			"existing DB": function () {
				Y.DatabaseManager.prototype._getDatabase.returns({
					version: '1'
				});
				this.stub(Y.DatabaseManager.prototype, 'removeExpired');

				var db = getDB();

				assert.called(db.removeExpired);
			}
		},

		"setItem": {
			"basic": function () {
				var db = getDB(), sqlExpect = '';
				db.setItem(SOMEKEY, SOMEVALUE, LIFETIME);

				assert.called(this.txStub.executeSql);
				sqlExpect = 'REPLACE INTO ' + DBTABLE;
				sqlExpect += ' (id, value, timeWritten, lifetime) VALUES (?, ?, ?, ?);';

				//TODO: Find proper syntax for this
				assert.equals(sqlExpect, this.txStub.executeSql.getCall(1).args[0]);
				assert.equals([SOMEKEY, SOMEVALUE, TIMEWRITTEN, LIFETIME], this.txStub.executeSql.getCall(1).args[1]);
			},

			"customFields": function () {
				var db = getDB({
						customFields: CUSTOMFIELDS
					}),
					sqlExpect = '';

				db.setItem(SOMEKEY, CUSTOMVALUE, LIFETIME);

				assert.called(this.txStub.executeSql);
				sqlExpect = 'REPLACE INTO ' + DBTABLE;
				sqlExpect += ' (id, value, flag, hash, timeWritten, lifetime) VALUES (?, ?, ?, ?, ?, ?);';

				assert.equals(sqlExpect, this.txStub.executeSql.getCall(1).args[0]);
				assert.equals([SOMEKEY, SOMEVALUE, SOMEFLAG, SOMEHASH, TIMEWRITTEN, LIFETIME], this.txStub.executeSql.getCall(1).args[1]);
			}
		},

		"getItem": {
			setUp: function () {
				this.callback = this.stub();
			},

			"no customFields": {
				setUp: function () {
					this.db = getDB();
				},

				"non-existant key": function () {
					this.txStub.executeSql.callsArgWith(2, this.stub(), {rows: []});

					this.db.getItem('noKeyAtAll', this.callback, false);

					assert.calledOnce(this.callback);
					assert.calledWithExactly(this.callback, null);
				},

				"existing key": function () {
					var item = { lifetime: LIFETIME, value: SOMEVALUE, timeWritten: TIMEWRITTEN }, sqlExpect = '';
					this.txStub.executeSql.callsArgWith(2, this.stub(), {
						rows: {
							length: 1,
							item: this.stub().returns(item)
					}});

					this.db.getItem(SOMEKEY, this.callback, false);

					assert.called(this.txStub.executeSql);
					sqlExpect = 'SELECT * FROM ' + DBTABLE + " WHERE id = :key;";
					assert.equals(sqlExpect, this.txStub.executeSql.getCall(1).args[0]);
					assert.equals([SOMEKEY], this.txStub.executeSql.getCall(1).args[1]);

					assert.calledOnce(this.callback);
					assert.calledWithExactly(this.callback, item);
				}
			},

			"customFields": {
				setUp: function () {
					this.db = getDB({
						customFields: CUSTOMFIELDS
					});
				},

				"non-existant key": function () {
					this.txStub.executeSql.callsArgWith(2, this.stub(), {rows: []});

					this.db.getItem('noKeyAtAll', this.callback, false);

					assert.calledOnce(this.callback);
					assert.calledWithExactly(this.callback, null);
				},

				"existing key": function () {
					var item = { lifetime: LIFETIME, value: SOMEVALUE, timeWritten: TIMEWRITTEN, flag: SOMEFLAG, hash: SOMEHASH};
					this.txStub.executeSql.callsArgWith(2, this.stub(), {
						rows: {
							length: 1,
							item: this.stub().returns(item)
					}});

					this.db.getItem(SOMEKEY, this.callback, false);

					assert.calledOnce(this.callback);
					assert.calledWithExactly(this.callback, item);
				}
			},

			"expiredLifetime": {
				setUp: function () {
					this.stub(Y.DatabaseManager.prototype, 'removeItem');
					this.db = getDB();
				},

				"expired item": {
					setUp: function () {
						var item = { lifetime: 1, value: SOMEVALUE, timeWritten: TIMEWRITTEN - 2, flag: SOMEFLAG, hash: SOMEHASH};
						this.txStub.executeSql.callsArgWith(2, this.stub(), {
							rows: {
								length: 1,
								item: this.stub().returns(item)
						}});
					},

					"delete": function () {
						this.db.getItem(SOMEKEY, this.spy(), true);

						assert.calledOnce(this.db.removeItem);
						assert.calledWithExactly(this.db.removeItem, SOMEKEY);
					},

					"don't delete if lifetimeCheck is false": function () {
						this.db.getItem(SOMEKEY, this.spy(), false);

						assert.notCalled(this.db.removeItem);
					}
				},

				"don't delete if lifetime is 0": function () {
					var item = { lifetime: 0, value: SOMEVALUE, timeWritten: TIMEWRITTEN - 2, flag: SOMEFLAG, hash: SOMEHASH};
					this.txStub.executeSql.callsArgWith(2, this.stub(), {
						rows: {
							length: 1,
							item: this.stub().returns(item)
					}});

					this.db.getItem(SOMEKEY, this.spy(), true);

					assert.notCalled(this.db.removeItem);
				},

				"don't delete unexpired item": function () {
					var item = { lifetime: 2, value: SOMEVALUE, timeWritten: TIMEWRITTEN - 2, flag: SOMEFLAG, hash: SOMEHASH};
					this.txStub.executeSql.callsArgWith(2, this.stub(), {
						rows: {
							length: 1,
							item: this.stub().returns(item)
					}});

					this.db.getItem(SOMEKEY, this.spy(), true);

					assert.notCalled(this.db.removeItem);
				}
			}
		},

		"removeItem": function () {
			var db = getDB();

			db.removeItem(SOMEKEY);

			sqlExpect = 'DELETE FROM ' + DBTABLE + " WHERE id = :key;";
			assert.equals(sqlExpect, this.txStub.executeSql.getCall(1).args[0]);
			assert.equals([SOMEKEY], this.txStub.executeSql.getCall(1).args[1]);
		},

		"removeExpired": function () {
			var db = getDB();

			db.removeExpired();

			sqlExpect = 'DELETE FROM ' + DBTABLE + " WHERE 0 < lifetime AND :time > (timeWritten + lifetime);";
			assert.equals(sqlExpect, this.txStub.executeSql.getCall(1).args[0]);
			assert.equals([TIMEWRITTEN], this.txStub.executeSql.getCall(1).args[1]);
		}
	};

	var allFeatures = {
		requiresSupportFor: {
			'localStorage': !!localStorage.getItem,
			'noDatabase': !!window.openDatabase
		},

		"Access is enabled by default": function () {
			Y.DatabaseManager.prototype._allowsDBAccess.restore();
			var db = getDB();
			assert.isTrue(db.get('allowsAccess'));
		}
	};

	var noDB =  {
		requiresSupportFor: {
			'localStorage': !!localStorage.getItem,
			'noDatabase': !window.openDatabase
		},

		"Access is disabled by default": function () {
			Y.DatabaseManager.prototype._allowsDBAccess.restore();
			var db = getDB();
			assert.isFalse(db.get('allowsAccess'));
		}
	};

	Y.mix(allFeatures, allBrowsers);
	Y.mix(noDB, allBrowsers);
	buster.testCase("Gallery Database Manager Tests with localStorage but no Database", noDB);
	buster.testCase("Gallery Database Manager Tests with localStorage and Database", allFeatures);
});
