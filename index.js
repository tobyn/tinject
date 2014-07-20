var _ = require("lodash"),
    async = require("async");


var fn = exports.fn = {},
    ifn = exports.ifn = {},
    copyLast = _.compose(_.partial,_.last);

_.each(["ignore", "sync", "async", "promise"],function(cc) {
  fn[cc] = annotator(cc,_.last);
  ifn[cc] = annotator(cc,copyLast);
});

function annotator(callingConvention, extractor) {
  return function(/* ...dependencies, f */) {
    var f = extractor(arguments);

    f.callingConvention = callingConvention;
    f.dependencies = _.initial(arguments);
    
    return f;
  };
}


exports.ProviderError = ProviderError;

function ProviderError(dependency, error) {
  this.dependency = dependency;
  this.error = error;
  this.message = dependency + ": " + (error.message || error.toString());
}

ProviderError.prototype = new Error();


exports.depend = depend;

function depend(/* ...dependencies, fn */) {
  var fn = _.last(arguments);

  fn.dependencies = _.initial(arguments);

  return fn;
}


exports.injector = function() {
  return new Injector();
};

exports.Injector = Injector;

function Injector() {
  this.cache = {};
  this.providers = {};
  this.resolveQueues = {};
}

Injector.prototype = {
  inject: function(/* f, ...extraArgs */) {
    var args = _.toArray(arguments);

    args.unshift(_.bindKey(this,"invoke"))

    return _.partial.apply(_,args);
  },

  invoke: function(f/*, ...extraArgs, callback */) {
    var i = this,
        extraArgs = _.initial(_.rest(arguments)),
        callback = _.last(arguments);

    async.map(getDependencies(f),handleResolution,function(err, args) {
      if (err)
        callback(err);
      else
        normalizedApply(f,args.concat(extraArgs),callback);
    });

    function handleResolution(dependency, callback) {
      i.resolve(dependency,function(err, result) {
        if (err)
          callback(new ProviderError(dependency,err));
        else
          callback(null,result);
      });
    }
  },

  provide: function(name, value) {
    this.cache[name] = [null, value];
  },

  providePromise: function(name, promise) {
    this.providers[name] = fn.promise(function() {
      return promise;
    });
  },

  provider: function(name, factory) {
    this.providers[name] = factory;
  },

  resolve: function(dependency, callback) {
    var i = this,
        cachedResult = i.cache[dependency];

    // This dependency has been resolved already.
    if (cachedResult) {
      callback.apply(i,cachedResult);
      return;
    }

    var resolveQueue = i.resolveQueues[dependency];

    // This dependency is being resolved in response to an earlier
    // request. All we need to do is wait.
    if (resolveQueue) {
      resolveQueue.push(callback);
      return;
    }

    var provider = i.providers[dependency];
    if (!provider) {
      callback(new Error("Not provided"));
      return;
    }

    resolveQueue = i.resolveQueues[dependency] = [callback];

    i.invoke(provider,function(err, result) {
      cachedResult = i.cache[dependency] = [err, result];

      _.each(resolveQueue,function(queuedCallback) {
        queuedCallback.apply(i,cachedResult);
      });

      resolveQueue = undefined;
      delete i.resolveQueues[dependency];
    });
  }
};


function getDependencies(f) {
  return f.dependencies || [];
}

function normalizedApply(f, args, callback) {
  var cc = f.callingConvention;

  try {
    if (cc === "ignore") {
      f.apply(this,args);
      callback();
    } else if (cc === "async") {
      args = args.slice();
      args.push(callback);
      f.apply(this,args);
    } else if (cc === "promise") {
      f.apply(this,args)
        .then(function(value) {
          callback(null,value);
        },callback);
    } else {
      callback(null,f.apply(this,args));
    }
  } catch (err) {
    callback(err);
  }
}
