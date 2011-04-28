/*jslint white: true, browser: true, onevar: true, undef: true, nomen: false, eqeqeq: true, plusplus: true, bitwise: true,
    regexp: true, newcap: false, immed: true */
/*global YUI, sinon, TestCase, fail, assertTrue, assertFalse, assertEquals, assertSame, assertNotSame, assertNull, assertNotNull,
    assertUndefined, assertNotUndefined, assertNaN, assertNotNaN, assertException, assertNoException, assertArray, assertTypeOf,
    assertBoolean, assertFunction, assertObject, assertNumber, assertString, assertMatch, assertNoMatch, assertTagName,
    assertClassName, assertElementId,assertInstanceOf, assertNotInstanceOf, assertFail, assertFailException, assertPass,
    assertNotCalled, assertCalled, assertCalledOnce, assertCalledTwice, assertCalledThrice, assertCallCount, assertCallOrder,
    assertCalledOn, assertAlwaysCalledOn, assertCalledWith, assertAlwaysCalledWith, assertCalledWithExactly, assertThrew,
    assertAlwaysThrew */
YUI().use('node', 'node-event-simulate', 'gallery-dispatcher', 'gallery-overlay-box', function (Y) {
    sinon.assert.expose(this, true);

    function randomString() {
        var i,
            chars = 'ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz',
            string_length = 8,
            randomstring = '',
            rnum;
        for (i = 0; i < string_length; i += 1) {
            rnum = Math.floor(Math.random() * chars.length);
            randomstring += chars.substring(rnum, rnum + 1);
        }
        return randomstring;
    }

    /**
     * Generates a container with random ID and returns it
     *
     * @return YUINode container with an ID
     */
    function doCreateContainer() {
        var container = Y.Node.create('<div id="' + randomString() + '" class="yui3-overlaybox-hidden hullahulla createdContainer">Foobar</div>');
        Y.one(document.body).append(container);
        return container;
    }

    TestCase('overlay-boxTest', sinon.testCase({
        tearDown: function () {
            Y.all('.createdContainer').remove();
        },

        'test that we can can create and defaults get set': function () {
            this.mock(Y.OverlayBox.prototype)
                .expects('hide')
                .once();

            var ob = new Y.OverlayBox();

            assertTrue(ob.get('toggleHidden'));
            assertFalse(ob.get('loadedContent'));
            assertFalse(ob.get('reload'));
            assertEquals(99, ob.get('zIndex'));
            assertSame(Y.one('.yui3-overlaybox-mask'), ob.get('greyOverlay'));
            assertSame(Y.one('.yui3-overlaybox'), ob.get('container'));
            assertSame(Y.one('.yui3-overlaybox .yui3-overlaybox-close-button'), ob.get('container').one('.yui3-overlaybox-close-button'));

            ob.get('container').one('.yui3-overlaybox-close-button').simulate('click');
        },

        'test that a container replacement gets correctly instantiated': function () {
            var ob, container;
            container = doCreateContainer();
            ob = new Y.OverlayBox({ container: container.get('id') });

            assertNull(Y.one('body > .hullahulla'));
            assertNull(Y.one('.yui3-overlaybox .yui3-overlaybox-hidden'));
            assertNotNull(Y.one('.yui3-overlaybox .hullahulla'));
            assertTrue(ob.get('loadedContent'));
        },

        'test that  a container overlaybox gets displayed correctly': function () {
            var ob, container;
            container = doCreateContainer();

            this.mock(Y.Overlay.prototype)
                .expects('render')
                .once();
            this.mock(Y.Overlay.prototype)
                .expects('show')
                .once();
            this.spy(Y, 'Overlay');

            ob = new Y.OverlayBox({ container: container.get('id') });
            ob.show();

            assertNull(Y.one('.yui3-overlaybox-hidden'));
            assertCalledOnce(Y.Overlay);
            assertCalledWithExactly(Y.Overlay, {
                srcNode: ob.get('container'),
                zIndex: 99,
                centered: true,
                plugins: [ Y.Plugin.OverlayKeepaligned ]
            });
        },

        'test that a ajax overlaybox gets displayed correctly': function () {
            var ob = new Y.OverlayBox({ url: 'foobar' });

            this.spy(Y, 'Dispatcher');
            this.spy(Y.Dispatcher.prototype, 'on');
            this.spy(Y.Dispatcher.prototype, 'set');

            assertFalse(ob.get('loadedContent'));
            ob.show();
            assertTrue(ob.get('loadedContent'));
            ob._set('loadedContent', true);
            ob.show(); //Make sure it doesn't do ajax request again

            assertNull(Y.one('.yui3-overlaybox-hidden'));
            assertInstanceOf(Y.Overlay, ob.get('overlay'));

            assertCalledOnce(Y.Dispatcher);
            assertCalledWithExactly(Y.Dispatcher, {node: ob.get('container').one('.content')});
            assertCalledWithExactly(Y.Dispatcher.prototype.on, 'ready', ob._showAfterDispatch, ob);
            assertCalledWithExactly(Y.Dispatcher.prototype.set, 'uri', 'foobar');

        },

        'test that showAfterDispatch refreshs and removes class': function () {
            var ob, container;
            container = doCreateContainer();

            ob = new Y.OverlayBox({ container: container.get('id') });
            ob.refresh = this.spy();
            ob.get('container').addClass('yui3-overlaybox-invisible');

            ob._showAfterDispatch();

            assertCalledOnce(ob.refresh);
            assertFalse(container.hasClass('yui3-overlaybox-invisible'));
        },

        'test that a overlaybox gets correctly hidden': function () {
            var ob, container;
            container = doCreateContainer();

            ob = new Y.OverlayBox({ container: container.get('id') });
            ob.show();
            ob._set('overlay', { hide: this.spy() });
            ob.hide();

            assertTrue(ob.get('greyOverlay').hasClass('yui3-overlaybox-hidden'));
            assertTrue(ob.get('container').hasClass('yui3-overlaybox-hidden'));
            assertCalledOnce(ob.get('overlay').hide);
        },

        'test that toggleHidden false is not removing hidden from the container': function () {
            var ob, container;
            container = doCreateContainer();

            ob = new Y.OverlayBox({ container: container.get('id'), toggleHidden: false });
            ob.show();
            assertTrue(ob.get('container').hasClass('yui3-overlaybox-hidden'));
            ob.get('container').removeClass('yui3-overlaybox-hidden');
            ob.hide();
            assertFalse(ob.get('container').hasClass('yui3-overlaybox-hidden'));
        },

        'test refresh': function () {
            var ob = new Y.OverlayBox({});
            ob._set('overlay', { syncUI: this.spy() });

            ob.refresh();

            assertCalledOnce(ob.get('overlay').syncUI);
        },

        'test setContent': function () {
            var ob, container;
            container = doCreateContainer();

            this.mock(Y.OverlayBox.prototype)
                .expects('refresh')
                .once();

            ob = new Y.OverlayBox({ container: container.get('id') });

            ob.setContent('<div id="newContent"/>');

            assertNotNull(Y.one('#newContent'));
        },

        'test that the overlaybox gets correctly destroyed': function () {
            var ob, container;
            container = doCreateContainer();

            this.mock(Y.OverlayBox.prototype)
                .expects('hide')
                .once();

            ob = new Y.OverlayBox({ container: container.get('id') });
            ob._set('overlay', {destroy: this.spy() });
            ob._set('greyOverlay', {remove: this.spy() });

            ob.destroy();
            assertCalledOnce(ob.get('overlay').destroy);
            assertCalledOnce(ob.get('greyOverlay').remove);
        },

        'test that bindClick binds an event and executes the open': function () {
            var ob, container, link;
            container = doCreateContainer();
            link = Y.Node.create('<a href="/index.html">Some Link</a>')

            ob = new Y.OverlayBox({ container: container.get('id') });
            ob.show = this.spy(ob.show);
            ob.bindClick(link);

            link.simulate('click');

            assertCalledOnce(ob.show);
        }
    }));
});
