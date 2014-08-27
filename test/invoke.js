var assert = require("assert"),
    di = require("../tinject"),
    bluebird = require("bluebird");

describe("Invoking",function() {
  var expectedError = new Error("Expected"),
      injector;

  beforeEach(function() {
    injector = di.injector();

    injector.provide("foo","foo");
  });


  describe("an un-annotated function",function() {
    it("should pass any arguments",function(done) {
      var args;

      injector.invoke(function() {
        args = arguments;
      },"foo",function() {
        assert.equal(args[0],"foo");
        done();
      });
    });

    it("should pass returned values to the callback",function(done) {
      injector.invoke(function() {
        return "foo";
      },function(err, foo) {
        assert.equal(foo,"foo");
        done();
      });
    });

    it("should pass thrown errors to the callback",function(done) {
      injector.invoke(function() {
        throw expectedError;
      },function(err) {
        assert.strictEqual(err,expectedError);
        done();
      });
    });
  });


  describe("a void function",function() {
    it("should resolve dependencies",function(done) {
      injector.invoke(di.fn.ignore("foo",function(foo) {
        assert.equal(foo,"foo");
      }),done);
    });

    it("should append any extra arguments",function(done) {
      injector.invoke(di.fn.ignore("foo",function(foo, bar) {
        assert.equal(foo,"foo");
        assert.equal(bar,"bar");
      }),"bar",done);
    });

    it("should ignore returned values",function(done) {
      injector.invoke(di.fn.ignore(function() {
        return "foo";
      }),function(err, unexpectedResult) {
        assert.ifError(err);
        assert.notEqual(unexpectedResult,"foo");
        done();
      });
    });

    it("should pass thrown errors to the callback",function(done) {
      injector.invoke(di.fn.ignore(function() {
        throw expectedError;
      }),function(err) {
        assert.strictEqual(err,expectedError);
        done();
      });
    });
  });


  describe("a synchronous function",function() {
    it("should resolve dependencies",function(done) {
      injector.invoke(di.fn.sync("foo",function(foo) {
        assert.equal(foo,"foo");
      }),done);
    });

    it("should append any extra arguments",function(done) {
      injector.invoke(di.fn.sync("foo",function(foo, bar) {
        assert.equal(foo,"foo");
        assert.equal(bar,"bar");
      }),"bar",done);
    });

    it("should pass returned values to the callback",function(done) {
      injector.invoke(di.fn.sync("foo",function(foo) {
        return foo.toUpperCase();
      }),function(err, foo) {
        assert.ifError(err);
        assert.equal(foo,"FOO");
        done();
      });
    });

    it("should pass thrown errors to the callback",function(done) {
      injector.invoke(di.fn.sync(function() {
        throw expectedError;
      }),function(err) {
        assert.strictEqual(err,expectedError);
        done();
      });
    });
  });


  describe("an asynchronous function",function() {
    it("should resolve dependencies",function(done) {
      injector.invoke(di.fn.async("foo",function(foo, callback) {
        assert.equal(foo,"foo");
        callback();
      }),done);
    });

    it("should append any extra arguments",function(done) {
      injector.invoke(di.fn.async("foo",function(foo, bar, callback) {
        assert.equal(foo,"foo");
        assert.equal(bar,"bar");
        callback();
      }),"bar",done);
    });

    it("should pass results to the callback",function(done) {
      injector.invoke(di.fn.async("foo",function(foo, callback) {
        callback(null,foo.toUpperCase());
      }),function(err, foo) {
        assert.ifError(err);
        assert.equal(foo,"FOO");
        done();
      });
    });

    it("should pass thrown errors to the callback",function(done) {
      injector.invoke(di.fn.async(function() {
        throw expectedError;
      }),function(err) {
        assert.strictEqual(err,expectedError);
        done();
      });
    });

    it("should pass errors to the callback",function(done) {
      injector.invoke(di.fn.async(function(callback) {
        callback(expectedError);
      }),function(err) {
        assert.strictEqual(err,expectedError);
        done();
      });
    });
  });


  describe("a promise-returning function",function() {
    it("should resolve dependencies",function(done) {
      injector.invoke(di.fn.promise("foo",function(foo) {
        return bluebird.resolve("foo");
      }),done);
    });

    it("should append any extra arguments",function(done) {
      injector.invoke(di.fn.promise("foo",function(foo, bar) {
        assert.equal(foo,"foo");
        assert.equal(bar,"bar");
        return bluebird.resolve();
      }),"bar",done);
    });

    it("should pass results to the callback",function(done) {
      injector.invoke(di.fn.promise("foo",function(foo) {
        return bluebird.resolve(foo.toUpperCase());
      }),function(err, foo) {
        assert.ifError(err);
        assert.equal(foo,"FOO");
        done();
      });
    });

    it("should pass thrown errors to the callback",function(done) {
      injector.invoke(di.fn.promise(function() {
        throw expectedError;
      }),function(err) {
        assert.strictEqual(err,expectedError);
        done();
      });
    });

    it("should pass rejection errors to the callback",function(done) {
      injector.invoke(di.fn.promise(function() {
        return bluebird.reject(expectedError);
      }),function(err) {
        assert.strictEqual(err,expectedError);
        done();
      });
    });
  });
});
