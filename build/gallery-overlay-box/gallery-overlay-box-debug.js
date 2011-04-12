YUI.add('gallery-overlay-box', function(Y) {

/*global Y*/
var OVERLAYBOX = 'overlay-box';

Y.OverlayBox = Y.Base.create(OVERLAYBOX, Y.Base, [], {
    initializer: function (config) {
        config = config || {};
        var container, originalNode, closeButton, greyOverlay;

        //Setting up the container
        container = Y.Node.create('<div class="overlaybox hidden"></div>');
        if (! config.container) {
            //No container is given so it should be an ajax overlaybox
            closeButton = Y.Node.create('<div class="overlaybox_close_button"></div>');
            closeButton.on('click', function (event) {
                event.halt();
                this.hide();
            }, this);
            container.append(closeButton);
            if (config.url) {
                container.addClass('yui3-overlay-loading');
            } else {
                Y.log('Nothing to display in the lightbox!');
            }
        } else {
            //Loadstuff from the given container into a more awesome one
            originalNode = Y.one('#' + config.container);
            container.insert(originalNode.cloneNode(true), 'replace');
            container.get('firstChild').removeClass('hidden');
            originalNode.remove();
            this._set('loadedContent', true);
        }
        Y.one(document.body).append(container);
        this.set('container', container);

        //Setup the overlay
        if (! config.greyOverlay) {
            greyOverlay = Y.Node.create('<div class="overlay hidden"></div>');
            greyOverlay.on('click', this.hide, this);
            Y.one(document.body).append(greyOverlay);
            this.set('greyOverlay', greyOverlay);
        }
    },

    destructor: function () {
        this.hide();

        if (this.get('overlay')) {
            this.get('overlay').destroy();
        }

        if (this.get('greyOverlay')) {
            this.get('greyOverlay').remove();
        }

        this.get('container').remove();
    },

    /**
    * Shows the lightbox in the current viewport
    *
    * @return void
    */
    show: function () {
        var overlay, dispatcher;
        overlay = this.get('overlay');
        if (false === this.get('loadedContent')) {
            dispatcher = new Y.Dispatcher({
                node: this.get('container')
            });
            dispatcher.after('loadingChange', this.refresh, this);
            dispatcher.set('uri', this.get('url'));
            this._set('loadedContent', true);
        }
        if (this.get('toggleHidden')) {
            this.get('container').removeClass('hidden');
        }

        if(Y.Lang.isUndefined(overlay)) {
            overlay = new Y.Overlay({
                srcNode: this.get('container'),
                zIndex: 99,
                align: {
                    points: [Y.WidgetPositionAlign.TC, Y.WidgetPositionAlign.TC]
                },
                plugins: [{ fn: Y.Plugin.OverlayKeepaligned }]
            });
            overlay.render();
            this.set('overlay', overlay);
        }
        this.get('greyOverlay').removeClass('hidden');
        overlay.show();
    },

    /**
     * Hides the lightbox from the current viewport.
     *
     * @return void
     */
    hide: function () {
        if (this.get('toggleHidden')) {
            this.get('container').addClass('hidden');
        }
        this.get('greyOverlay').addClass('hidden');
        if (this.get('overlay')) {
            this.get('overlay').hide();
        }
    },

    /**
     * Refreshs the positioning etc. of the lightbox in the current viewport.
     *
     * @return void
     */
    refresh: function () {
        if (! Y.Lang.isUndefined(this.get('overlay'))) {
            this.get('overlay').syncUI();
        }
    },

    /**
     * Sets the content to whatever you pass into it.
     * WATCHOUT: It will not be reset if you don't specify reload: true when
     * the user opens it next time.
     *
     * @param string the HTML to put in
     * @return void
     */
    setContent: function (content) {
        this.get('container').insert(content);
        this.refresh();
    }
}, {
    ATTRS: {
        container: {
            readOnly: true
        },
        url: {
            writeOnce: 'initOnly',
            validator: Y.Lang.isString
        },
        greyOverlay: {
            writeOnce: true
        },
        toggleHidden: {
            value: true,
            validator: Y.Lang.isBoolean
        },
        reload: {
            value: false,
            validator: Y.Lang.isBoolean
        },
        loadedContent: {
            value: false,
            readOnly: true
        },
        overlay: {
            writeOnce: true
        }
    }
});


}, '@VERSION@' ,{requires:['base', 'node-base', 'gallery-overlay-extras', 'gallery-dispatcher']});
