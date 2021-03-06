var assert = require("assert"),
    di = require("../tinject");

describe("Declaring dependencies",function() {
  testAnnotator("ignore",di.fn.IGNORE,"a void");
  testAnnotator("sync",di.fn.SYNC,"a synchronous");
  testAnnotator("async",di.fn.ASYNC,"an asynchronous");
  testAnnotator("promise",di.fn.PROMISE,"a promise-returning");
  testAnnotator("injected",di.fn.INJECTED,"an injected");
  testAnnotator("constructor",di.fn.CONSTRUCTOR,"a constructor");

  function testAnnotator(callingConvention, code, label) {
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

        function f() {
          args = arguments;
          return "success";
        }

        it("should return a new function",function() {
          assert.notStrictEqual(fDep,f);
        });

        it("should return a proxy to the original function",function() {
          var result = fDep("foo","bar","baz");
          assert.equal(args.length,3);
          assert.equal(args[0],"foo");
          assert.equal(args[1],"bar");
          assert.equal(args[2],"baz");
          assert.equal(result,"success");
        });

        testProperties(fDep);
      });

      function testProperties(fDep) {
        it("should set the function's \"dependencies\" property",function() {
          assert.deepEqual(fDep.dependencies,["foo","bar"]);
        });

        it("should set the function's \"callingConvention\" property",function() {
          assert.equal(fDep.callingConvention,code);
        });
      }
    });
  }
});
