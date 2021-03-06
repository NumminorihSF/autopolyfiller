/*global describe, it, beforeEach, afterEach*/
/*jshint expr:true*/

var scan = require('../lib/polyfill-scan');
var mockParser = require('./fixtures/parser');
var astQuery = require('grasp-equery').query;
var expect = require('chai').expect;

describe('polyfill-scan', function () {
    /* jshint maxstatements: 20 */

    it('scans for prototype-based polyfills', function () {
        var polyfills = scan('"".trim();');
        expect(polyfills).to.eql(['String.prototype.trim']);
    });

    it('scans for prototype-based polyfills in deep statements', function () {
        var polyfills = scan('var x = a.b.c.d.e.f.g.trim();');
        expect(polyfills).to.eql(['String.prototype.trim']);
    });

    it('scans for prototype-based polyfills that called by call, apply or bind', function () {
        var polyfills = scan(
            '"".trim.call(" 1 ");' +
            '[].some.bind([], function () {});'
        );
        expect(polyfills).to.eql(['String.prototype.trim', 'Function.prototype.bind', 'Array.prototype.some']);
    });

    it('scans for static method polyfills', function () {
        var polyfills = scan('Object.create();Object.keys');
        expect(polyfills).to.eql(['Object.create', 'Object.keys']);
    });

    it('ignores deep expressions that mocks as static methods', function () {
        var polyfills = scan('My.Object.create();Oh.My.Object.create();');
        expect(polyfills).to.eql([]);
    });

    it('finds padded static methods', function () {
        var polyfills = scan('window.Object.create();');
        expect(polyfills).to.eql(['Object.create']);
    });

    it('finds square brackets static methods', function () {
        var polyfills = scan('window["Object"]["create"]();(JSON["parse"]);');
        expect(polyfills).to.eql(['Object.create', 'Window.prototype.JSON']);
    });

    it('scans for static method polyfills that called by call, apply or bind', function () {
        var polyfills = scan(
            'Object.create.bind(null);' +
            'JSON.parse.call(JSON, "{}");'
        );
        expect(polyfills).to.eql(['Function.prototype.bind', 'Object.create', 'Window.prototype.JSON']);
    });

    it('scans for constructor polyfills', function () {
        var polyfills = scan('new Promise();');
        expect(polyfills).to.eql(['Promise']);
    });

    it('scans for padded constructor polyfills', function () {
        var polyfills = scan('new window.Promise();');
        expect(polyfills).to.eql(['Promise']);
    });

    it('scans for global function polyfills', function () {
        var polyfills = scan(
            'window.btoa();' +
            'window.btoa.call();' +

            'atob();' +
            'atob.apply();' +

            'this.btoa();' +
            'this.btoa.call();'
        );
        expect(polyfills).to.eql(['Window.prototype.base64']);
    });

    it('returns unique polyfills', function () {
        var polyfills = scan('new Promise();new Promise();"".trim();"".trim();Object.create();Object.create();');
        expect(polyfills).to.eql(['Promise', 'String.prototype.trim', 'Object.create']);
    });

    it('uses custom parser', function () {
        var polyfills = scan('array.map(x => x * x)', mockParser);
        expect(polyfills).to.eql(['Array.prototype.map']);
    });

    it('provides custom parser options', function () {
        expect(function () {
            scan('array.map(x => x * x)', mockParser, 42);
        }).to.throw(Error);

        expect(function () {
            scan('array.map(x => x * x)', mockParser, {});
        }).to.not.throw(Error);
    });

    describe('.use', function () {

        it('uses custom matches', function () {
            scan.use({
                test: function (ast) {
                    return astQuery('new PewpewOlolo(_$)', ast).length ? ['PewpewOlolo'] : [];
                }
            });
            var polyfills = scan('new PewpewOlolo();');
            expect(polyfills).to.eql(['PewpewOlolo']);
        });

    });

});
