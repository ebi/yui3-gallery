/*jslint white: true, onevar: true, browser: true, undef: true, nomen: false, regexp: true, plusplus: true, bitwise: true, newcap: true, maxerr: 50, indent: 4 */
/*global YUI, localStorage, window*/
YUI.add('gallery-dispatcher-localStorage', function (Y) {
    'use strict';

    var DISPATCHER = 'dispatcher',
        LOCALSTORAGE = 'localStorage',
        DISPATCHER_LOCALSTORAGE = DISPATCHER + '-' + LOCALSTORAGE,

        ATTR_LOCALSTORAGE_HANDLER = LOCALSTORAGE + 'Handler',
        ATTR_LOCALSTORAGE_NAMESPACE = LOCALSTORAGE + 'Namespace',

        CONTENT = 'content',
        HOST = 'host';

    Y.namespace('Dispatcher').localStorage = Y.Base.create(DISPATCHER_LOCALSTORAGE, Y.Plugin.Base, [], {

        initializer: function (config) {
            if (this._hasLocalStorage()) {
                this.onHostEvent('uriChange', this._getContent, this);
            }
        },

        _getContent: function (event) {
            event.halt();

            var url = event.newVal,
                content = this._getItem(url);
            if (null !== content) {
                this.get(HOST).set(CONTENT, content);
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
        },

        _storeContent: function (id, response, data) {
            this.get(ATTR_LOCALSTORAGE_HANDLER).setItem(data.url, response.responseText);
            this.get(HOST).set(CONTENT, response.responseText);
        },

        _getItem: function (name) {
            return this.get(ATTR_LOCALSTORAGE_HANDLER).getItem(this.get(ATTR_LOCALSTORAGE_NAMESPACE) + name);
        },

        _hasLocalStorage: function () {
            try {
                return LOCALSTORAGE in window && window[LOCALSTORAGE] !== null;
            } catch (e) {
                return false;
            }
        }
    }, {
        NS: LOCALSTORAGE,
        ATTRS: {
            localStorageHandler: {
                value: localStorage
            },

            localStorageNamespace: {
                value: '',
                validator: Y.Lang.isString
            }
        }
    });
}, '0.1', {requires: ['base', 'plugin', 'gallery-dispatcher', 'io-base']});
