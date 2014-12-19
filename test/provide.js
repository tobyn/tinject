var assert = require("assert"),
    di = require("..");

describe("Declaring a provider",function() {
  var injector;

  beforeEach(function() {
    injector = di.injector();
  });

  it("should make it available",function(done) {
    injector.provide("foo","foo");

    injector.resolve("foo",function(err, foo) {
      try {
        assert.ifError(err);
        assert.strictEqual(foo,"foo");
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it("should fail if the name is already registered",function() {
    injector.provide("foo","foo");

    assert.throws(function() {
      injector.provide("foo","bar");
    },Error);
  });
});

describe("Declaring providers in bulk",function() {
  var injector;

  beforeEach(function() {
    injector = di.injector();
  });

  it("should make each provider available",function(done) {
    injector.provide({ foo: "foo", bar: "bar" });

    injector.invoke(di.fn.ignore("foo","bar",function(foo, bar) {
      assert.strictEqual(foo,"foo");
      assert.strictEqual(bar,"bar");
    }),function(err) {
      try {
        assert.ifError(err);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it("should fail if any of the names are already registered",function() {
    injector.provide("foo","foo");

    assert.throws(function() {
      injector.provide({ foo: "foo", bar: "bar" });
    },Error);
  });
});

describe("Overriding a provider",function() {
  var injector;

  beforeEach(function() {
    injector = di.injector();
  });

  it("should not require an existing provider",function(done) {
    injector.provide("foo","foo",true);

    injector.resolve("foo",function(err, foo) {
      try {
        assert.ifError(err);
        assert.strictEqual(foo,"foo");
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it("should update the provider",function(done) {
    injector.provide("foo","foo");
    injector.provide("foo","bar",true);

    injector.resolve("foo",function(err, foo) {
      try {
        assert.ifError(err);
        assert.strictEqual(foo,"bar");
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it("should work with bulk syntax",function(done) {
    injector.provide("foo","foo");
    injector.provide({ foo: "bar", bar: "baz" },true);

    injector.resolve("foo",function(err, foo) {
      try {
        assert.ifError(err);
        assert.strictEqual(foo,"bar");
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it("should invalidate previous resolves",function(done) {
    injector.provide("foo","foo");

    injector.resolve("foo",function(err, foo) {
      try {
        assert.ifError(err);
        assert.strictEqual(foo,"foo");

        injector.provide("foo","bar",true);

        injector.resolve("foo",function(err, foo) {
          try {
            assert.ifError(err);
            assert.strictEqual(foo,"bar");
            done();
          } catch (e) {
            done(e);
          }
        });
      } catch (e) {
        done(e);
        return;
      }
    });
  });

  it("should invalidate previous resolves recursively",function(done) {
    injector.provide("foo","foo");

    injector.provide("foobar",di.fn.sync("foo",function(foo) {
      return foo + "bar";
    }));

    injector.resolve("foobar",function(err, foobar) {
      try {
        assert.ifError(err);
        assert.strictEqual(foobar,"foobar");

        injector.provide("foo","bar",true);

        injector.resolve("foobar",function(err, foobar) {
          try {
            assert.ifError(err);
            assert.strictEqual(foobar,"barbar");
            done();
          } catch (e) {
            done(e);
          }
        });
      } catch (e) {
        done(e);
        return;
      }
    });
  });
});
