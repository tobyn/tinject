var _ = require("lodash"),
    assert = require("assert"),
    async = require("async"),
    di = require("..");

describe("A child injector",function() {
  var injector, parent;

  beforeEach(function() {
    parent = di.injector();
    injector = parent.child();
  });

  it("should make the parent's providers available",function(done) {
    parent.provide("foo","foo");

    injector.invoke(di.fn.ignore("foo",function(foo) {
      assert.equal(foo,"foo");
    }),function(err) {
      assert.ifError(err);
      done();
    });
  });

  it("should prefer providers from more recently inherited injectors",
    function(done) {
      var newerParent = di.injector();

      parent.provide("foo","older");
      newerParent.provide("foo","newer");

      injector.inherit(newerParent);

      injector.invoke(di.fn.ignore("foo",function(foo) {
        assert.equal(foo,"newer");
      }),function(err) {
        assert.ifError(err);
        done();
      });
    });

  it("should prefer non-inherited providers",function(done) {
    injector.provide("foo",di.fn.sync(function() { return "local"; }));

    parent.provide("foo","inherited");

    injector.invoke(di.fn.ignore("foo",function(foo) {
      assert.equal(foo,"local");
    }),function(err) {
      assert.ifError(err);
      done();
    });
  });

  it("should share inherited dependencies",function(done) {
    var calls = 0;

    parent.provide("foo",di.fn.sync(function() {
      calls++;
      return "foo";
    }));

    injector.inherit(parent);

    var f = di.fn.sync("foo",_.identity);

    async.series([
      injector.inject(f),
      parent.inject(f)
    ],function(err, results) {
      assert.ifError(err);
      assert.deepEqual(results,["foo","foo"]);
      assert.equal(1,calls);
      done();
    });
  });

  it("should require an identical dependency graph for sharing",function(done) {
    parent.provide("foobar",di.fn.sync("foo",function(foo) {
      return foo + "bar";
    }));

    injector.provide("foo","FOO");
    parent.provide("foo","foo");

    var f = di.fn.sync("foobar",_.identity);

    async.series([
      injector.inject(f),
      parent.inject(f)
    ],function(err, results) {
      assert.ifError(err);
      assert.deepEqual(results,["FOObar","foobar"]);
      done();
    });
  });

  it("should bubble up recursive missing providers",function(done) {
    parent.provide("bar",di.fn.ignore("foo",function() { }));

    injector.resolve("bar",function(err) {
      if (!err || err.name !== "ProviderError")
        done(new Error("Expected ProviderError, got " + String(err)));
      else
        done();
    });
  });
});
