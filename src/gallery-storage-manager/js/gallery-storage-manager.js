/*jslint white: true, onevar: true, browser: true, undef: true, nomen: false, regexp: true, plusplus: true, bitwise: true, newcap: true, maxerr: 50, indent: 4 */
/*global YUI, localStorage, window*/
YUI.add('gallery-storage-manager', function (Y) {
    'use strict';

    // Shorthand
    var STORAGEMANAGER = 'StorageManager',
        w = Y.config.win,
        l = Y.Lang,
        isString = l.isString,
        JSON = Y.JSON,

    //Constants
        LOCALSTORAGE = 'localStorage',

    //Attributes
        ATTR_DRIVER = 'storageDriver',
        ATTR_CONTENT = 'contentProperty',
        ATTR_META = 'metaSeparator',
        ATTR_NAMESPACE = 'localStorageNamespace',
        ATTR_DEFAULT_META = 'defaultMetaData',
        ATTR_LIFETIME = 'defaultLifetime',
        ATTR_LIFETIME_CHECK = 'checkLifetime';


    /**
     * Returns the default metadata for the current time
     */
    function _generateDefaultMeta () {
        return {
            timeWritten: Date.now(),
            lifetime: this.get(ATTR_LIFETIME)
        };
    }


    Y.StorageManager = Y.Base.create(STORAGEMANAGER, Y.Base, [], {

        /**
         * Initializer uses gallery-storage-lite if available or localStorage if it's there
         */
        initializer: function (config) {
            config = config || {};
            if (l.isUndefined(config[ATTR_DRIVER])) {
                if (! l.isUndefined(Y.StorageLite)) {
                    this.set(ATTR_DRIVER, Y.StorageLite);
                } else {
                    this.set(ATTR_DRIVER, localStorage);
                }
            }
        },

         /**
         * Removes all items from the data store.
         *
         * @method clear
         */
        clear: function () {
            return this.get(ATTR_DRIVER).clear();
        },

        /**
         * Returns the item with the specified key, or <code>null</code> if the item
         * was not found. If the lifetime of the item is expired it will be deleted
         * and <code>null> will be returned.
         *
         * @method getItem
         * @param {String} key
         * @return {Object|null} item or <code>null</code> if not found or expired
         */
        getItem: function (key) {
            if (this.get(ATTR_LIFETIME_CHECK)) {
                var meta = this.getMeta(key);

                if (0 < meta.lifetime && meta.timeWritten + (meta.lifetime * 1000) > Date.now()) {
                    this.removeItem(key);
                    return null;
                }

            }
            return this.get(ATTR_DRIVER).getItem(this.get(ATTR_NAMESPACE) + key);
        },

        /**
         * Returns the meta information for the item fo the specified key, or
         * <code>null</code> if no meta data was found
         *
         * @method getItem
         * @param {String} key
         * @return {Object} meta data or empty object if none found
         */
        getMeta: function (key) {
            return Y.JSON.parse(this.get(ATTR_DRIVER).getItem(this.get(ATTR_NAMESPACE) + this.get(ATTR_META) + key)) || {};
        },

        /**
         * Returns the number of items in the data store.
         *
         * @method length
         * @return {Number} number of items in the data store
         */
        length: function () {
            return this.get(ATTR_DRIVER).length;
        },

        /**
         * Removes the item with the specified key.
         *
         * @method removeItem
         * @param {String} key
         */
        removeItem: function (key) {
            this.get(ATTR_DRIVER).removeItem(this.get(ATTR_NAMESPACE) + key);
            this.get(ATTR_DRIVER).removeItem(this.get(ATTR_NAMESPACE) + this.get(ATTR_META) + key);
        },

        /**
         * Stores an item under the specified key. If the key already exists in the
         * data store, it will be replaced.
         *
         * @method setItem
         * @param {String} key
         * @param {Object} value
         * @param {Object} metaData overwrites the default metaData
         */
        setItem: function (key, value, metaData) {
            metaData = metaData || {};
            var meta = Y.mix(this.get(ATTR_DEFAULT_META), metaData, true);
            this.get(ATTR_DRIVER).setItem(this.get(ATTR_NAMESPACE) + key, value);

            this.get(ATTR_DRIVER).setItem(this.get(ATTR_NAMESPACE) + this.get(ATTR_META) + key, Y.JSON.stringify(meta));
        }
    }, {
        ATTRS: {
            storageDriver: {
                value: w.localStorage
            },

            contentProperty: {
                value: 'content',
                validator: isString
            },

            metaSeparator: {
                value: 'meta',
                validator: isString
            },

            localStorageNamespace: {
                value: '',
                validator: isString
            },

            defaultMetaData: {
                valueFn: _generateDefaultMeta
            },

            defaultLifetime: {
                value: 0, //Seconds
                validator: l.isNumber
            },

            checkLifetime: {
                value: true,
                validator: l.isBoolean
            }
        }
    });
}, '0.1', {requires: ['base', 'json'], optional: ['gallery-storage-lite'] });
