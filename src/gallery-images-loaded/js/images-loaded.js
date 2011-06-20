/**
* Provides synthetic event to detect if all images are loaded.
*
* @module images-loaded
*/

var EVENT_TYPE = 'images:loaded';

/**
 * Provides a subscribable event named &quot;beacon:reached&quot;.
 *
 * @event images:loaded
 * @param type {String} 'images:loaded'
 * @param fn {Function} the callback function
 * @param id {String|Node|etc} the element to bind (typically document)
 * @param o {Object} optional context object
 * @param args 0..n additional arguments that should be provided
 * to the listener.
 * @return {Event.Handle} the detach handle
 */

Y.Event.define(EVENT_TYPE, {
    _attach: function (node, subscription, notifier, filter) {
        var method = filter ? 'delegate' : 'on', nodeList, image;

        if (filter) {
            method = 'delegate';
            if (!Y.Lang.isString(filter)) {
                throw new Error('only string filter is supported');
            }
            nodeList = node.all(filter);
        } else {
            method = 'on';
            nodeList = new Y.NodeList(node);
        }

        subscription._images = [];
        Y.each(nodeList, function (subscriptionNode) {
            if ('IMG' === subscriptionNode.get('nodeName')) {
                if (false === subscriptionNode.get('complete')) {
                    this._attachImageListeners(subscription, notifier, subscriptionNode);
                    subscription._images.push(subscriptionNode);
                }
            } else {
                Y.each(subscriptionNode.all('img'), function (image) {
                    if (false === image.get('complete')) {
                        this._attachImageListeners(subscription, notifier, image);
                        subscription._images.push(image);
                    }
                }, this);
            }
        }, this);

        this._checkImages(subscription, notifier);
    },

    _checkImages: function (subscription, notifier) {
        var i, length, image;
        for (i = 0, length = subscription._images.length; i < length; i += 1) {
            image = subscription._images[i];
            if (image && true === image.get('complete')) {
                subscription._images.splice(i, 1);
            }
        }

        if (0 === subscription._images.length) {
            notifier.fire();
        }
    },

    _attachImageListeners: function (subscription, notifier, image) {
        var imageInstance = new Image();
        imageInstance.onload = Y.bind(this._checkImages, this, subscription, notifier);
        imageInstance.src = image.get('src');
    },

    _detach: function (subscription, method) {
        var handle = subscription['_' + method + 'Handle'];
        if (handle) {
            handle.cancel();
        }
    },

    on: function (node, subscription, notifier) {
        this._attach.apply(this, arguments);
    },

    detach: function (node, subscription) {
        this._detach(subscription, 'on');
    },

    delegate: function (node, subscription, notifier, filter) {
        this._attach.apply(this, arguments);
    },

    detachDelegate: function (node, subscription) {
        this._detach(subscription, 'delegate');
    }
});
