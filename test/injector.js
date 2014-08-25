var assert = require("assert"),
    di = require("..");

describe("An injector",function() {
  var injector;

  beforeEach(function() {
    injector = di.injector();
  });

  it("should allow providers to be declared in bulk",function(done) {
    injector.provide({
      foo: "foo",
      bar: "bar"
    });

    injector.invoke(di.fn.ignore("foo","bar",function(foo, bar) {
      assert.equal(foo,"foo");
      assert.equal(bar,"bar");
    }),function(err) {
      assert.ifError(err);
      done();
    });
  });

  it("should complain if a provider is redefined",function() {
    injector.provide("foo","foo");

    assert.throws(function() {
      injector.provide("foo","bar");
    },Error);
  });
});
