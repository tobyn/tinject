var _ = require("lodash"),
    assert = require("assert"),
    async = require("async"),
    di = require(".."),
    Promise = require("bluebird");

describe("Resolving a dependency",function() {
  var expectedError = new Error("Expected"),
      injector;
  
  beforeEach(function() {
    injector = di.injector();
  });


  it("should pass provided values",function(done) {
    injector.provide("foo","bar");

    injector.resolve("foo",function(err, foo) {
      assert.ifError(err);
      assert.equal(foo,"bar");
      done();
    });
  });

  it("should work recursively",function(done) {
    injector.provider("foo",di.fn.promise(function() {
      return Promise.resolve("FOO").delay(1);
    }));

    injector.provider("bar",di.fn.async(function(callback) {
      setTimeout(function() {
        callback(null,"BAR");
      });
    }));

    injector.provider("foobar",di.fn.sync("foo","bar",function(foo, bar) {
      return foo + bar;
    }));

    injector.resolve("foobar",function(err, foobar) {
      assert.ifError(err);
      assert.equal(foobar,"FOOBAR");
      done();
    });
  });

  it("should bubble up recursive errors",function(done) {
    injector.provider("foo",di.fn.sync(function() {
      throw expectedError;
    }));

    injector.provider("bar",di.fn.sync("foo",function(foo) {
      return "bar";
    }));

    injector.resolve("bar",function(err, bar) {
      assert.equal(err.dependency,"foo");
      assert.strictEqual(err.error,expectedError);
      done();
    });
  });


  describe("from a promise",function() {
    it("should pass fulfillment values",function(done) {
      injector.providePromise("foo",Promise.resolve("bar").delay(1));

      injector.resolve("foo",function(err, foo) {
        assert.ifError(err);
        assert.equal(foo,"bar");
        done();
      });
    });

    it("should pass rejection errors",function(done) {
      injector.providePromise("foo",Promise.reject(expectedError));

      injector.resolve("foo",function(err) {
        assert.strictEqual(err,expectedError);
        done();
      });
    });
  });


  describe("from an un-annotated provider function",function() {
    it("should pass return values",function(done) {
      injector.provider("foo",function() {
        return "bar";
      });

      injector.resolve("foo",function(err, foo) {
        assert.ifError(err);
        assert.equal(foo,"bar");
        done();
      });
    });

    it("should pass thrown errors",function(done) {
      injector.provider("foo",function() {
        throw expectedError;
      });

      injector.resolve("foo",function(err) {
        assert.strictEqual(err,expectedError);
        done();
      });
    });

    it("should only call the provider once",function(done) {
      var calls = 0,
          resolve = _.partial(_.bindKey(injector,"resolve"),"foo");

      injector.provider("foo",function() {
        calls++;
        return "bar";
      });

      async.parallel([resolve,resolve,resolve],function(err, results) {
        assert.deepEqual(results,["bar","bar","bar"]);
        assert.equal(calls,1);
        done();
      });
    });
  });


  describe("from a void provider function",function() {
    it("should discard returned values",function(done) {
      injector.provider("foo",di.fn.ignore(function() {
        return "bar";
      }));

      injector.resolve("foo",function(err, foo) {
        assert.ifError(err);
        assert.equal(foo,undefined);
        done();
      });
    });

    it("should pass thrown errors",function(done) {
      injector.provider("foo",di.fn.ignore(function() {
        throw expectedError;
      }));

      injector.resolve("foo",function(err) {
        assert.strictEqual(err,expectedError);
        done();
      });
    });

    it("should only call the provider once",function(done) {
      var calls = 0,
          resolve = _.partial(_.bindKey(injector,"resolve"),"foo");

      injector.provider("foo",di.fn.ignore(function() {
        calls++;
        return "bad";
      }));

      async.parallel([resolve,resolve,resolve],function(err, results) {
        assert.equal(calls,1);
        done();
      });
    });
  });


  describe("from a synchronous provider function",function() {
    it("should pass return values",function(done) {
      injector.provider("foo",di.fn.sync(function() {
        return "bar";
      }));

      injector.resolve("foo",function(err, foo) {
        assert.ifError(err);
        assert.equal(foo,"bar");
        done();
      });
    });

    it("should pass thrown errors",function(done) {
      injector.provider("foo",di.fn.sync(function() {
        throw expectedError;
      }));

      injector.resolve("foo",function(err) {
        assert.strictEqual(err,expectedError);
        done();
      });
    });

    it("should only call the provider once",function(done) {
      var calls = 0,
          resolve = _.partial(_.bindKey(injector,"resolve"),"foo");

      injector.provider("foo",di.fn.sync(function() {
        calls++;
        return "bar";
      }));

      async.parallel([resolve,resolve,resolve],function(err, results) {
        assert.deepEqual(results,["bar","bar","bar"]);
        assert.equal(calls,1);
        done();
      });
    });
  });


  describe("from an asynchronous provider function",function() {
    it("should pass values given to the callback",function(done) {
      injector.provider("foo",di.fn.async(function(callback) {
        process.nextTick(function() {
          callback(null,"bar");
        });
      }));

      injector.resolve("foo",function(err, foo) {
        assert.ifError(err);
        assert.equal(foo,"bar");
        done();
      });
    });

    it("should pass thrown errors",function(done) {
      injector.provider("foo",di.fn.async(function() {
        throw expectedError;
      }));

      injector.resolve("foo",function(err) {
        assert.strictEqual(err,expectedError);
        done();
      });
    });

    it("should pass errors given to the callback",function(done) {
      injector.provider("foo",di.fn.async(function(callback) {
        callback(expectedError);
      }));

      injector.resolve("foo",function(err) {
        assert.strictEqual(err,expectedError);
        done();
      });
    });

    it("should only call the provider once",function(done) {
      var calls = 0,
          resolve = _.partial(_.bindKey(injector,"resolve"),"foo");

      injector.provider("foo",di.fn.async(function(callback) {
        calls++;
        setTimeout(function() {
          callback(null,"bar");
        });
      }));

      async.parallel([resolve,resolve,resolve],function(err, results) {
        assert.deepEqual(results,["bar","bar","bar"]);
        assert.equal(calls,1);
        done();
      });
    });
  });


  describe("from a promise provider function",function() {
    it("should pass fulfillment values",function(done) {
      injector.provider("foo",di.fn.promise(function() {
        return Promise.resolve("bar").delay(1);
      }));

      injector.resolve("foo",function(err, foo) {
        assert.ifError(err);
        assert.equal(foo,"bar");
        done();
      });
    });

    it("should pass thrown errors",function(done) {
      injector.provider("foo",di.fn.promise(function() {
        throw expectedError;
      }));

      injector.resolve("foo",function(err) {
        assert.strictEqual(err,expectedError);
        done();
      });
    });

    it("should pass rejection errors",function(done) {
      injector.provider("foo",di.fn.promise(function() {
        return Promise.reject(expectedError);
      }));

      injector.resolve("foo",function(err) {
        assert.strictEqual(err,expectedError);
        done();
      });
    });

    it("should only call the provider once",function(done) {
      var calls = 0,
          resolve = _.partial(_.bindKey(injector,"resolve"),"foo");

      injector.provider("foo",di.fn.promise(function() {
        calls++;
        return Promise.resolve("bar").delay(1);
      }));

      async.parallel([resolve,resolve,resolve],function(err, results) {
        assert.deepEqual(results,["bar","bar","bar"]);
        assert.equal(calls,1);
        done();
      });
    });
  });
});
