/***********************************************************************
* This is a deliberately slow and contrived app, but it demonstrates
* many injector features, and the delays inserted are long enough that
* it should be obvious which computations are happening on each request.
***********************************************************************/

var bluebird = require("bluebird"),
    di = require(".."),
    fn = di.fn;

var app = require("express")(),
    appInjector = di.injector(),
    route = router(appInjector);

// Providers can be defined individually, but this bulk syntax makes it
// easy to do something like:
//
// injector.provide(require("./user"));
// injector.provide(require("./blog"));
// injector.provide(require("./comments"));
//
// An injector provides a flat namespace, though. Be careful not to
// export two providers with the same name from different modules. The
// injector will throw an error if you try to redefine an existing
// provider. You *can* override existing providers using the inheritance
// mechanism.
appInjector.provide({
  // Then-ables returned from providers with the promise annotation are
  // resolved before being injected. If the promise is rejected, the
  // provider fails.
  //
  // This provider depends on the current request, so its value will
  // be computed once per request.
  //
  // Function annotators like fn.promise return the function they're
  // given. The result isn't dependent on being called by an injector,
  // so it can be used in other contexts or unit tested like any other
  // function.
  name: fn.promise("request",function(request) {
    return bluebird.delay(request.query.name || "stranger",3000);
  }),

  // Then-ables can be provided directly, too. As above, they are
  // resolved before being injected, and rejections are treated as
  // provider failures.
  fail: bluebird.reject(new Error("This is an expected error")),

  // Synchronous functions are the default provider type, so you don't
  // have to annotate them if they don't depend on anything. This
  // function is called on the first request and the result is cached.
  startTime: Date.now,

  // If you want to provide a promise or a function as a value
  // rather than having the injector handle it, wrap it in di.value.
  log: di.value(console.log),

  // Even though Date.now doesn't use the request argument, the request
  // dependency prevents it from being memoized like startTime.
  //
  // The di.fn functions modify the function they are given before
  // returning it. If you don't want to do that, you can use the di.ifn
  // equivalent. It creates a wrapper function that calls the original,
  // then annotates and returns the wrapper.
  //
  // Useful for built-ins and library functions you don't "own".
  requestStartTime: di.ifn.sync("request",Date.now),

  // This function represents an expensive, node-style asynchronous
  // computation. Maybe translations need to be loaded from a database.
  //
  // Because it doesn't depend on anything request-specific, it's only
  // computed on the first request. Because it doesn't depend on name,
  // or vice versa, both are computed in parallel. That means the first
  // request takes five seconds, and subsequent requests take three.
  salutation: fn.async(function(callback) {
    setTimeout(function() {
      callback(null,"Hello");
    },5000);
  }),

  // Some of this function's dependencies are computed once and reused.
  // Some are computed on each request. Some come from promises, regular
  // functions, and node-style asynchronous providers. This function
  // just takes a bunch of values and relies on the injector to handle
  // the details.
  //
  // Annotating a function with "ignore" indicates to the injector that
  // you're evaluating the function for its side effects, and you want
  // the injector to throw away anything it might return.
  greeting: fn.ignore(
      "log","name","requestStartTime","response","salutation","startTime",
      function(log, name, requestStartTime, response, salutation, startTime) {
    var now = Date.now(),
        requestDuration = now - requestStartTime,
        serverUptime = now - startTime;

    var greeting = salutation + ", " + name + "! (request: " +
                   toSeconds(requestDuration) + "s, uptime: " +
                   toSeconds(serverUptime) + "s)";

    log("Sending greeting: " + greeting);
    
    response.set("Content-Type","text/plain").send(greeting);

    function toSeconds(ms) {
      return Math.round(ms / 100) / 10;
    }
  })
});

app.get("/",route("greeting"));
app.get("/err",route("fail"));

app.listen(8080);


function router(appInjector) {
  return function(name) {
    return function(req, res, next) {
      // Inheriting from appInjector makes all of appInjector's
      // providers available to the new injector.
      var inj = di.injector(appInjector);

      // Providing "request" and "response" on an injector we only use
      // for one requests ensures that any computation that depends on
      // them is only cached for the duration of that request.
      inj.provide("request",req);
      inj.provide("response",res);

      inj.resolve(name,function(err) {
        // All errors are collected here. Exceptions thrown by
        // providers, rejected promises, and errors passed to callbacks
        // are all handled in one place.
        if (err)
          next(err);
      });
    };
  };
}
