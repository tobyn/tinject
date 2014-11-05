var Promise = require("bluebird"),
    di = require("../tinject"),
    fn = di.fn;

var app = require("express")(),
    appInjector = di.injector(),
    route = router(appInjector);

/* Providers can be defined individually, but this bulk syntax makes it
 * easy to do something like:
 *
 * injector.provide(require("./user"));
 * injector.provide(require("./blog"));
 * injector.provide(require("./comments"));
 *
 * An injector provides a flat namespace, though. Be careful not to
 * export two providers with the same name from different modules. The
 * injector will throw an error if you try to redefine an existing
 * provider. You *can* override existing providers using the inheritance
 * mechanism.
 */
appInjector.provide({
  // The simplest provider is just a value.
  startTime: Date.now(),

  // This function will be called once, on the first request, and its
  // return value will be cached for the lifetime of appInjector. An ifn
  // function is used to avoid modifying Date.now.
  firstRequestTime: di.ifn.sync(Date.now),

  // This function is injected as-is.
  now: Date.now,

  // This provider doesn't *really* depend on "request". The dependency
  // is declared to prevent the value from being cached across requests.
  requestStartTime: fn.sync("request",function() {
    return Date.now();
  }),

  // async providers receive an extra node-style callback argument.
  name: fn.async("request",function(request, callback) {
    setTimeout(function() {
      callback(null,request.query.name || "stranger");
    },3000);
  }),

  // Promises are resolved before being injected.
  salutation: Promise.delay("Hello",5000),

  // Promises can also be returned by promise providers. This one
  // simulates some sort of failure.
  systemError: fn.promise(function() {
    return Promise.delay(1000).then(function() {
      throw new Error("System error!");
    });
  }),

  // This function will be partially applied. It will receive "now" from
  // the injector, and "start" must provided by the caller.
  duration: fn.injected("now",function(now, start) {
    var ms = now() - start,
        seconds = Math.round(ms / 100) / 10;

    return seconds + " seconds";
  })
});

// Annotating this function with ignore indicates that we're evaluating
// it for side effects only. Any returned values are discarded by the
// injector.
var greeting = fn.ignore(
  "duration", 
  "firstRequestTime",
  "name",
  "requestStartTime",
  "response",
  "salutation",
  "startTime",
function(
  duration,
  firstRequestTime,
  name,
  requestStartTime,
  response,
  salutation,
  startTime
) {
  var body =
    salutation + ", " + name + "!\n\n" +
    "Time since server start:  " + duration(startTime) + "\n" +
    "Time since first request: " + duration(firstRequestTime) + "\n" +
    "Duration of this request: " + duration(requestStartTime);

  response.status(200)
          .set("Content-Type","text/plain")
          .end(body);
});

app.get("/",route(greeting));

// This function will never be called, because one of its dependencies
// will fail to be resolved.
var fail = fn.ignore(
    "response", "systemError",
    function(response, systemError) {
  response.status(200)
          .set("Content-Type","text/plain")
          .end("Shouldn't get here");
});

app.get("/fail",route(fail));

app.listen(8080);


function router(appInjector) {
  return function(handler) {
    return function(req, res, next) {
      // Inheriting from appInjector makes all of appInjector's
      // providers available to the new injector.
      var inj = di.injector(appInjector);

      // Computations that depend on these values will only be cached
      // for as long as the inherited injector is in use. In this case,
      // until the end of the current request.
      inj.provide("request",req);
      inj.provide("response",res);

      inj.invoke(handler,function(err) {
        // Exceptions thrown by providers, rejected promises, and errors
        // passed to callbacks are all handled here.
        if (err) next(err);
      });
    };
  };
}
