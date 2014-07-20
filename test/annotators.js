var assert = require("assert"),
    di = require("..");

describe("Declaring dependencies",function() {
  testAnnotator("ignore","a void");
  testAnnotator("sync","a synchronous");
  testAnnotator("async","an asynchronous");
  testAnnotator("promise","a promise-returning");

  function testAnnotator(callingConvention, label) {
    describe("for " + label + " function",function() {
      describe("mutably",function() {
        function f() { }

        var annotator = di.fn[callingConvention],
            fDep = annotator("foo","bar",f);

        it("should return the function",function() {
          assert.strictEqual(fDep,f);
        });

        testProperties(fDep);
      });

      describe("immutably",function() {
        var annotator = di.ifn[callingConvention],
            args,
            fDep = annotator("foo","bar",f);

        function f() { args = arguments; }

        it("should return a new function",function() {
          assert.notStrictEqual(fDep,f);
        });

        it("should return a proxy to the original function",function() {
          fDep("foo");
          assert.equal(args[0],"foo");
        });

        testProperties(fDep);
      });

      function testProperties(fDep) {
        it("should set the function's \"dependencies\" property",function() {
          assert.deepEqual(fDep.dependencies,["foo","bar"]);
        });

        it("should set the function's \"callingConvention\" property",function() {
          assert.equal(fDep.callingConvention,callingConvention);
        });
      }
    });
  }
});
