var assert = require("assert"),
    di = require("..");

describe("A cloned injector",function() {
  var injector, source;

  beforeEach(function() {
    source = di.injector();
  });

  it("should share pre-clone providers",function(done) {
    source.provide("foo","foo");

    injector = source.clone();

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

  it("should not share post-clone providers",function(done) {
    injector = source.clone();

    source.provide("foo","foo");

    injector.resolve("foo",function(err, foo) {
      try {
        assert.ok(err,"Found post-clone provider");
        done();
      } catch (e) {
        done(e);
      }
    });
  });


  it("should share pre-clone resolves",function(done) {
    var resolves = 0;

    source.provide("foo",di.fn.sync(function() {
      resolves++;
      return "foo";
    }));

    source.resolve("foo",function(err, foo) {
      try {
        assert.ifError(err);
        assert.strictEqual(foo,"foo");
      } catch (e) {
        done(e);
        return;
      }

      injector = source.clone();

      injector.resolve("foo",function(err, foo) {
        try {
          assert.ifError(err);
          assert.strictEqual(foo,"foo");
          assert.strictEqual(resolves,1);
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });

  it("should not share post-clone resolves",function(done) {
    var resolves = 0;

    source.provide("foo",di.fn.sync(function() {
      resolves++;
      return "foo";
    }));

    injector = source.clone();

    source.resolve("foo",function(err, foo) {
      try {
        assert.ifError(err);
        assert.strictEqual(foo,"foo");
      } catch (e) {
        done(e);
        return;
      }

      injector.resolve("foo",function(err, foo) {
        try {
          assert.ifError(err);
          assert.strictEqual(foo,"foo");
          assert.strictEqual(resolves,2);
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });


  it("should share pre-clone parents",function(done) {
    var parent = di.injector();

    parent.provide("foo","foo");

    source.inherit(parent);

    injector = source.clone();

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

  it("should not share parents inherited post-clone",function(done) {
    var parent = di.injector();

    parent.provide("foo","foo");

    injector = source.clone();

    source.inherit(parent);

    injector.resolve("foo",function(err, foo) {
      try {
        assert.ok(err,"Resolved from post-clone parent");
        done();
      } catch (e) {
        done(e);
      }
    });
  });
});
