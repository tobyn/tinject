var _ = require("lodash"),
    assert = require("assert"),
    async = require("async"),
    di = require("..");

describe("Inheriting from another injector",function() {
  var injector, other;

  beforeEach(function() {
    injector = di.injector();
    other = di.injector();

    injector.inherit(other);
  });

  it("should make the parent's providers available",function(done) {
    other.provide("foo","foo");

    injector.invoke(di.fn.ignore("foo",function(foo) {
      assert.equal(foo,"foo");
    }),function(err) {
      assert.ifError(err);
      done();
    });
  });

  it("should prefer providers from more recently inherited injectors",
    function(done) {
      var newer = di.injector();

      other.provide("foo","older");
      newer.provide("foo","newer");

      injector.inherit(newer);

      injector.invoke(di.fn.ignore("foo",function(foo) {
        assert.equal(foo,"newer");
      }),function(err) {
        assert.ifError(err);
        done();
      });
    });

  it("should prefer non-inherited providers",function(done) {
    injector.provide("foo",function() { return "local"; });

    other.provide("foo","inherited");

    injector.invoke(di.fn.ignore("foo",function(foo) {
      assert.equal(foo,"local");
    }),function(err) {
      assert.ifError(err);
      done();
    });
  });

  it("should share inherited dependencies",function(done) {
    var calls = 0;

    other.provide("foo",function() {
      calls++;
      return "foo";
    });

    injector.inherit(other);

    var f = di.fn.sync("foo",_.identity);

    async.series([
      injector.inject(f),
      other.inject(f)
    ],function(err, results) {
      assert.ifError(err);
      assert.deepEqual(results,["foo","foo"]);
      assert.equal(1,calls);
      done();
    });
  });

  it("should require an identical dependency graph for sharing",function(done) {
    other.provide("foobar",di.fn.sync("foo",function(foo) {
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
      done();
    });
  });
});
