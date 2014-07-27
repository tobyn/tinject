var _ = require("lodash"),
    assert = require("assert"),
    async = require("async"),
    di = require("..");

describe("Inheriting from another injector",function() {
  var injector, other;

  beforeEach(function() {
    injector = di.injector();
    other = di.injector();
  });

  it("should make the parent's providers available",function(callback) {
    other.provide("foo","foo");

    injector.inherit(other);

    injector.invoke(di.fn.ignore("foo",function(foo) {
      assert.equal(foo,"foo");
    }),function(err) {
      assert.ifError(err);
      callback();
    });
  });

  it("should prefer providers from more recently inherited injectors",
    function(callback) {
      var ignored = di.injector();

      other.provide("foo","other");
      ignored.provide("foo","ignored");

      injector.inherit(ignored);
      injector.inherit(other);

      injector.invoke(di.fn.ignore("foo",function(foo) {
        assert.equal(foo,"other");
      }),function(err) {
        assert.ifError(err);
        callback();
      });
    });

  it("should prefer non-inherited providers",function(callback) {
    injector.provider("foo",function() { return "local"; });

    other.provide("foo","inherited");

    injector.invoke(di.fn.ignore("foo",function(foo) {
      assert.equal(foo,"local");
    }),function(err) {
      assert.ifError(err);
      callback();
    });
  });

  it("should share inherited dependencies",function(callback) {
    var calls = 0;

    other.provider("foo",function() {
      calls++;
      return "foo";
    });

    var f = di.fn.sync("foo",_.identity);

    async.series([
      injector.inject(f),
      other.inject(f)
    ],function(err, results) {
      assert.ifError(err);
      assert.deepEqual(results,["foo","foo"]);
      assert.equal(1,calls);
      callback();
    });
  });

  it("should require an identical dependency graph for sharing",function(callback) {
    other.provider("foobar",di.fn.sync("foo",function(foo) {
      return foo + "bar";
    }));

    injector.provide("foo","FOO");
    other.provide("foo","foo");

    var f = di.fn.sync("foobar",_.identity);

    async.series([
      injector.inject(f),
      other.inject(f)
    ],function(err, results) {
      assert.ifError(err);
      assert.deepEqual(results,["FOObar","foobar"]);
      callback();
    });
  });
});
