var assert = require("assert"),
    di = require("..");

describe("An injected function",function() {
  var injector;

  beforeEach(function() {
    injector = di.injector();

    injector.provider("foo",di.fn.async(function(callback) {
      process.nextTick(function() {
        callback(null,"foo");
      });
    }));
  });

  it("should not resolve dependencies unless called",function() {
    var resolved = false;

    injector.provider("unneeded",function() {
      resolved = true;
    });

    injector.inject(di.fn.ignore("unneeded",function() { }));

    assert(!resolved);
  });

  describe("when called",function() {
    it("should resolve dependencies",function(done) {
      var f = injector.inject(di.fn.ignore("foo",function(foo) {
        assert.equal(foo,"foo");
      }));

      f(function(err) {
        assert.ifError(err);
        done();
      });
    });

    it("should pass inject-time extra arguments",function(done) {
      var f = injector.inject(di.fn.ignore("foo",function(foo, bar) {
        assert.equal(foo,"foo");
        assert.equal(bar,"bar");
      }),"bar");

      f(function(err) {
        assert.ifError(err);
        done();
      });
    });

    it("should pass call-time extra arguments",function(done) {
      var f = injector.inject(di.fn.ignore("foo",function(foo, bar) {
        assert.equal(foo,"foo");
        assert.equal(bar,"bar");
      }));

      f("bar",function(err) {
        assert.ifError(err);
        done();
      });
    });

    it("should pass results to the callback",function(done) {
      var f = injector.inject(
        di.fn.async("foo",
          function(foo, bar, baz, callback) {
            setImmediate(function() {
              callback(null,foo + bar + baz);
            });
          }),
        "bar");

      f("baz",function(err, foobarbaz) {
        assert.equal(foobarbaz,"foobarbaz");
        done();
      });
    });

    it("should pass errors to the callback",function(done) {
      var expectedError = new Error("Expected"),
          f = injector.inject(function() {
            throw expectedError;
          });

      f(function(err) {
        assert.strictEqual(err,expectedError);
        done();
      });
    });
  });
});
