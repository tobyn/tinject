var assert = require("assert"),
    di = require("../tinject");

describe("A provided injected function",function() {
  var injector;

  beforeEach(function() {
    injector = di.injector();

    injector.provide("foo","FOO");

    injector.provideInjected("foobar",di.fn.ignore("foo",function(foo) {
      return foo + "bar";
    }));
  });

  it("should resolve dependencies",function(done) {
    injector.invoke(di.fn.sync("foobar",function(foobar) {
      return foobar();
    }),function(err, result) {
      assert.ifError(err);
      assert.equal(result,"FOObar");
      done();
    });
  });

  it("should resolve dependecies in children if inherited",function(done) {
    var child = di.injector(injector);

    child.provide("foo","fu");

    child.invoke(di.fn.sync("foobar",function(foobar) {
      return foobar();
    }),function(err, result) {
      assert.ifError(err);
      assert.equal(result,"fubar");
      done();
    });
  });

  it("should pass provide-time extra arguments",function(done) {
    injector.provideInjected("foobaz",di.fn.ignore("foo",function(foo, baz) {
      return foo + baz;
    }),"BAZ");

    injector.invoke(di.fn.sync("foobaz",function(foobaz) {
      return foobaz();
    }),function(err, result) {
      assert.ifError(err);
      assert.equal(result,"FOOBAZ");
      done();
    });
  });

  it("should pass call-time extra arguments",function(done) {
    injector.provideInjected("foobaz",di.fn.ignore("foo",function(foo, baz) {
      return foo + baz;
    }));

    injector.invoke(di.fn.sync("foobaz",function(foobaz) {
      return foobaz("BAZ");
    }),function(err, result) {
      assert.ifError(err);
      assert.equal(result,"FOOBAZ");
      done();
    });
  });
});
