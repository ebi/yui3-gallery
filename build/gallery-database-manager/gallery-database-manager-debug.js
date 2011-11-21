YUI.add('gallery-database-manager', function(Y) {

/*jslint nomen: false, indent: 4 */
/*global Y, openDatabase, window, localStorage*/
'use strict';

// Shorthand
var DBMANAGER = 'DatabaseManager',
	l = Y.Lang,
	isString = l.isString,

//Constants
	DBVERSION = '1',
	DBTABLE = 'yuiGalleryKeyValueStore',
	DISABLED = 'disabled',

//Attributes
	ATTR_HANDLE = 'dbHandle',
	ATTR_DBNAME = 'databaseName',
	ATTR_DBTABLE = 'databaseTable',
	ATTR_DBDESC = 'databaseDescription',
	ATTR_DBSIZE = 'databaseSize',
	ATTR_LIFETIME = 'defaultLifetime',
	ATTR_LIFETIME_CHECK = 'checkLifetime',
	ATTR_SAVE_DISABLE = 'saveDisable',
	ATTR_DISABLED = 'dbDisabledPropertyName',
	ATTR_ALLOWED = 'allowsAccess',
	ATTR_CUSTOM = 'customFields',
	ATTR_HASDB = 'supportsDB';

function errorHandler(tx, error) {
	if (l.isUndefined(tx)) {
		Y.log('Got no transaction variable for error logging', 'error', DBMANAGER);
	} else {
		Y.log(tx, 'error', DBMANAGER);
	}

	if (l.isUndefined(error)) {
		Y.log('No error given (or probably no transaction if the error just got logged', 'error', DBMANAGER);
	} else {
		Y.log(error, 'error', DBMANAGER);
	}
}

Y.DatabaseManager = Y.Base.create(DBMANAGER, Y.Base, [], {
	/**
	 * Will setup the database to the current schema
	 *
	 * @param {Object} config The config object we receive from your new Y.DatabaseManager call
	 * @return {Void}
	 **/
	initializer: function (config) {
		config = config || {};
		var db = null, customFields, table = this.get(ATTR_DBTABLE);
		if (this.get(ATTR_ALLOWED)) {
			try {
				db = this._getDatabase(this.get(ATTR_DBNAME), '', this.get(ATTR_DBDESC), this.get(ATTR_DBSIZE));
				this.get(ATTR_CUSTOM).push({ name: 'value', type: 'BLOB' });
				Y.log('Database opened for writing', 'info', DBMANAGER);
				if (db.version !== DBVERSION) {
					Y.log('Database has a different version than expected', 'warn', DBMANAGER);
					if ('' === db.version) {
						customFields = this.get(ATTR_CUSTOM);
						Y.log('Database gets initialized', 'info', DBMANAGER);
						db.changeVersion(db.version, DBVERSION, function (tx) {
							//Initialize the DB
							var sqlStr = 'CREATE TABLE ' + table + ' (id TEXT PRIMARY KEY, ';
							Y.each(customFields, function (field) {
								sqlStr += field.name + ' ' + field.type + ', ';
							});
							sqlStr += 'timeWritten INTEGER, lifetime INTEGER);';
							tx.executeSql(sqlStr);
						}, function () {}, errorHandler); //The iPad expects tbe empty function or will throw an error
					}
				} else {
					this.removeExpired();
				}
			} catch (e) {
				this._disableDBAccess();
			}
		}
		this._set(ATTR_HANDLE, db);
	},

	/**
	 * Returns a database handle
	 *
	 * @param {String} name of the Database
	 * @param {String} version of the Database
	 * @param {String} description of the Database
	 * @param {Number} size estimation for the Database
	 * @returns {Object} DatabaseHandle
	 **/
	_getDatabase: function (name, version, description, size) {
		return openDatabase(name, version, description, size);
	},

	/**
	 * Returns a date that can easily be replaced
	 **/
	_getNow: function () {
		return Math.floor(Y.Lang.now() / 1000);
	},

	/**
	 * Sets an item to the given Value
	 *
	 * @param {String} key The name under which it will be stored.
	 * @param {Mixed} value If it's a string the additional fields will be empty. If it's an object it will only set the provided fields;
	 * @param {Number} lifetime Overwrites the default lifetime.
	 * @return {Void}
	 */
	setItem: function (key, value, lifetime) {
		if (!this.get(ATTR_HANDLE)) {
			return;
		}

		lifetime = lifetime || this.get(ATTR_LIFETIME);
		var record = [key],
			additionalPlaceHolders = '',
			sqlStr = '';

		sqlStr = 'REPLACE INTO ' + this.get(ATTR_DBTABLE) + ' (id, ';
		//Build Records array from custom Fields and normal values.
		if (isString(value)) {
			record.push(value);
			sqlStr += 'value, ';
			additionalPlaceHolders = '?, ';
		} else {
			Y.each(this.get(ATTR_CUSTOM), function (field) {
				if (! l.isUndefined(value[field.name])) {
					sqlStr += field.name + ', ';
					additionalPlaceHolders += '?, ';
					record.push(value[field.name]);
				}
			});
		}
		record.push(this._getNow(), lifetime);
		sqlStr += 'timeWritten, lifetime) VALUES (?, ' + additionalPlaceHolders + '?, ?);';
		this.get(ATTR_HANDLE).transaction(function (tx) {
			Y.log(sqlStr);
			Y.log(record);
			tx.executeSql(sqlStr, record, null, errorHandler);
		});
	},

	/**
	 * Passes the item to the given callback. Will delete it if expired
	 *
	 * @param {String} key The Name of the item.
	 * @param {Function} callback Will be called with the result.
	 * @param {Boolean} checkLifetime To overwrite the default check behaviour.
	 * @return {Void}
	 */
	getItem: function (key, callback, checkLifetime) {
		var time = this._getNow(), dbm = this;
		if (!this.get(ATTR_HANDLE)) {
			callback.call(callback, null);
			return;
		}
		checkLifetime = Y.Lang.isUndefined(checkLifetime) ? this.get(ATTR_LIFETIME_CHECK) : checkLifetime;
		this.get(ATTR_HANDLE).transaction(function (tx) {
			tx.executeSql('SELECT * FROM ' + dbm.get(ATTR_DBTABLE) + " WHERE id = :key;", [key], function (tx, results) {
				if (0 === results.rows.length) {
					callback.call(callback, null);
					return;
				}
				var item = results.rows.item(0);
				if (checkLifetime && 0 < item.lifetime && time > (item.timeWritten + item.lifetime)) {
					dbm.removeItem(key);
					callback.call(callback, null);
					return;
				}
				Y.log('Read key "' + key + '" for value "' + item.value + '"', 'info', DBMANAGER);
				callback.call(callback, item);
			}, errorHandler);
		});
	},

	/**
	 * Removes the item with the given key from the database
	 *
	 * @param {String} key The key of the item which will be deleted
	 * @return {Void}
	 */
	removeItem: function (key) {
		var table = this.get(ATTR_DBTABLE);
		if (!this.get(ATTR_HANDLE)) {
			return;
		}
		this.get(ATTR_HANDLE).transaction(function (tx) {
			var sqlStr = 'DELETE FROM ' + table + " WHERE id = :key;";
			Y.log(sqlStr);
			tx.executeSql(sqlStr, [key], null, errorHandler);
		});
	},

	/**
	 * Removes all expired items from the database
	 *
	 * @return {Void}
	 */
	removeExpired: function () {
		var time = this._getNow(), table = this.get(ATTR_DBTABLE);
		if (!this.get(ATTR_HANDLE)) {
			return;
		}
		this.get(ATTR_HANDLE).transaction(function (tx) {
			var sqlStr = 'DELETE FROM ' + table + " WHERE 0 < lifetime AND :time > (timeWritten + lifetime);";
			Y.log(sqlStr);
			tx.executeSql(sqlStr, [time], null, errorHandler);
		});
	},

	/**
	 * Remembers that the client didn't allow to create the DB and disables it
	 *
	 * @return {Void}
	 */
	_disableDBAccess: function () {
		var name = this.get(ATTR_DISABLED);
		Y.log('The user disallowed access to the Database', 'warn', DBMANAGER);
		this._set(ATTR_ALLOWED, false);
		if (! this.get(ATTR_SAVE_DISABLE)) {
			return;
		}
		try {
			localStorage.setItem(name, DISABLED);
			Y.log('Disabling future access by setting localStorage entry: ' + name, 'info', DBMANAGER);
		} catch (e) {
			//If localStorage is not available we use cookies
			Y.Cookie.set(name, DISABLED);
			Y.log('Disabling future access by setting cookie: ' + name, 'info', DBMANAGER);
		}
	},

	/**
	 * Returns if the client supports database
	 *
	 * @return {Boolean} True if it generally supports DBs
	 */
	_supportsDB: function () {
		return !!window.openDatabase;
	},

	/**
	 * Returns if the client supports database and allowed the size you asked for while creating
	 *
	 * @return {Boolean} true if access is possible
	 */
	_allowsDBAccess: function () {
		if (this.get(ATTR_HASDB)) {
			Y.log('Database found', 'info', DBMANAGER);
			//The user has a DB now we want to know if we disabled access because he declined it
			try {
				if (null === localStorage.getItem(this.get(ATTR_DISABLED))) {
					//Still check the cookie because the write fails if localStorage is full.
					return this._allowsDBAccessByCookie();
				} else {
					//We do this only to get a nice log entry
					Y.log('Database disabled by localStorage entry: ' + this.get(ATTR_DISABLED), 'info', DBMANAGER);
					return false;
				}
			} catch (e) {
				return this._allowsDBAccessByCookie();
			}
		}
		Y.log('Database not found', 'info', DBMANAGER);
		return false;
	},

	/**
	 * Checks if the client has a disable cookie
	 *
	 * @return {Boolean} true if he has a cookie
	 */
	_allowsDBAccessByCookie: function () {
		if (null === Y.Cookie.get(this.get(ATTR_DISABLED))) {
			return true;
		}
		Y.log('Database disabled by cookie', 'info', DBMANAGER);
		return false;
	}
}, {
	ATTRS: {
		dbHandle: {
			readOnly: true
		},

		databaseName: {
			value: DBMANAGER,
			validator: isString,
			writeOnce: 'initOnly'
		},

		databaseTable: {
			value: DBTABLE,
			validator: isString,
			readOnly: true
		},

		databaseSize: {
			value: 5 * 1024 * 1024,
			validator: l.isNumber,
			writeOnce: 'initOnly'
		},

		databaseDescription: {
			value: 'Default YUI3 Gallery DatabaseManager Database',
			validator: isString,
			writeOnce: 'initOnly'
		},

		defaultLifetime: {
			value: 0, //Seconds
			validator: l.isNumber
		},

		checkLifetime: {
			value: true,
			validator: l.isBoolean
		},

		saveDisable: {
			value: true,
			validator: l.isBoolean
		},

		dbDisabledPropertyName: {
			value: DBMANAGER + 'disabledDB'
		},

		allowsAccess: {
			valueFn: '_allowsDBAccess',
			readOnly: true
		},

		supportsDB: {
			valueFn: '_supportsDB',
			readOnly: true
		},

		customFields: {
			value: []
		}
	}
});


}, '@VERSION@' ,{requires:['base', 'cookie']});
