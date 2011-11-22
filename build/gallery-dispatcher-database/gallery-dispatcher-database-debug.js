YUI.add('gallery-dispatcher-database', function(Y) {

/*jslint nomen: false, indent: 4 */
/*global Y, window, navigator*/
    'use strict';

    var DISPATCHER = 'dispatcher',
        DATABASE = 'database',
        DISPATCHER_DATABASE = DISPATCHER + '-' + DATABASE,

        ATTR_STORE = 'storeResponse',
        ATTR_DB = 'databaseManager',

        CONTENT = 'content',
        HOST = 'host';

    Y.namespace('Dispatcher').database = Y.Base.create(DISPATCHER_DATABASE, Y.Plugin.Base, [], {

        initializer: function (config) {
            if (!!window.openDatabase) {
                if (Y.Lang.isUndefined(this.get(ATTR_DB))) {
                    this.set(ATTR_DB, new Y.DatabaseManager({ }));
                }
                this.onHostEvent('uriChange', this._getContent, this);
            }
        },

        _getContent: function (event) {
            event.halt();

            var url = event.newVal,
                host = this.get(HOST);

            this.get(ATTR_DB).getItem(url, Y.bind(function (content) {
                if (null !== content) {
                    host.set(CONTENT, content.value);
                } else if ((! Y.Lang.isUndefined(navigator.onLine)) && false === navigator.onLine) {
                    this.fire('offlineAndNotCached');
                    return;
                } else {
                    Y.io(url, {
                        on: {
                            success: this._storeContent
                        },
                        context: this,
                        'arguments': {
                            url: url
                        }
                    });
                }
            }, this));
        },

        _storeContent: function (id, response, data) {
            if (this.get(ATTR_STORE)) {
                this.get(ATTR_DB).setItem(data.url, response.responseText);
            }
            this.get(HOST).set(CONTENT, response.responseText);
        }
    }, {
        NS: DATABASE,
        ATTRS: {
            databaseManager: {
            },
            storeResponse: {
                value: true,
                validator: Y.Lang.isBool
            }
        }
    });


}, '@VERSION@' ,{requires:['base-build', 'plugin', 'io-base', 'gallery-dispatcher', 'gallery-database-manager']});
