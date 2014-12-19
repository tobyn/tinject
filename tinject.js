(function() {
"use strict";

var exports;
if (typeof module !== "undefined") {
  exports = module.exports;
} else {
  var oldDI = window.di;
  exports = window.di = {};

  exports.noConflict = function() {
    window.di = oldDI;
    return exports;
  };
}

var fn = exports.fn = {},
    ifn = exports.ifn = {},
    slice = Array.prototype.slice;

var IGNORE   = fn.IGNORE   = 1,
    SYNC     = fn.SYNC     = 2,
    ASYNC    = fn.ASYNC    = 3,
    PROMISE  = fn.PROMISE  = 4,
    INJECTED = fn.INJECTED = 5;

fn.ignore = annotator(IGNORE,extractFn);
fn.sync = annotator(SYNC,extractFn);
fn.async = annotator(ASYNC,extractFn);
fn.promise = annotator(PROMISE,extractFn);
fn.injected = annotator(INJECTED,extractFn);

ifn.ignore = annotator(IGNORE,copyFn);
ifn.sync = annotator(SYNC,copyFn);
ifn.async = annotator(ASYNC,copyFn);
ifn.promise = annotator(PROMISE,copyFn);
ifn.injected = annotator(INJECTED,copyFn);

function annotator(callingConvention, extractor) {
  return function(/* dependencies..., f */) {
    var f = extractor(arguments);

    f.callingConvention = callingConvention;
    f.dependencies = slice.call(arguments,0,arguments.length-1);
    
    return f;
  };
}

function copyFn(args) {
  var fn = extractFn(args);

  return function() {
    return fn.apply(this,arguments);
  };
}

function extractFn(args) {
  return args[args.length-1];
}


exports.ProviderError = ProviderError;

function ProviderError(dependency, error) {
  this.dependency = dependency;
  this.name = "ProviderError";
  this.error = error;
  this.message = dependency + ": " + (error.message || error.toString());
  setStack(this,error);
}

ProviderError.prototype = new Error();

function setStack(error, cause) {
  var chain = error.dependency,
      stack;

  while (cause instanceof ProviderError) {
    chain += " -> " + cause.dependency;
    cause = cause.error;
  }

  stack = cause.stack || cause.message || cause.toString();

  error.stack = "ProviderError: " + chain + " caused by:\n" + stack;
}


exports.injector = function() {
  return new Injector();
};

exports.Injector = Injector;

function Injector() {
  this.parents = [];
  this.cache = {};
  this.providers = {};
  this.resolveQueues = {};
}

Injector.prototype = {
  child: function() {
    var child = new Injector();
    child.inherit(this);
    return child;
  },

  clone: function() {
    var clone = new Injector(),
        c, p,
        cache = this.cache,
        cloneCache = clone.cache,
        parents = this.parents,
        cloneParents = clone.parents,
        providers = this.providers,
        cloneProviders = clone.providers;

    for (c in cache)
      cloneCache[c] = cache[c];

    for (p in parents)
      cloneParents[p] = parents[p];

    for (p in providers)
      cloneProviders[p] = providers[p];

    return clone;
  },

  inherit: function(other) {
    this.parents.unshift(other);
  },

  inject: function(/* f, extraArgs... */) {
    var preArgs = slice.call(arguments),
        injector = this;

    return function() {
      var args = preArgs.concat(slice.call(arguments));
      injector.invoke.apply(injector,args);
    };
  },

  invoke: function(f/*, extraArgs..., callback */) {
    var i = this,
        lastIndex = arguments.length - 1,
        extraArgs = slice.call(arguments,1,lastIndex),
        callback = arguments[lastIndex];

    resolveDependencies(i,f,function(err, args) {
      if (err)
        callback(err);
      else
        normalizedApply(f,args.concat(extraArgs),callback);
    });
  },

  provide: function(name, provider/*, extraArgs... */) {
    if (typeof name === "object") {
      var extraArgs = slice.call(arguments,1);

      for (var realName in name)
        this.provide.apply(this,[realName,name[realName]].concat(extraArgs));

      return;
    }

    if (name in this.providers)
      throw new Error(name + ": Provider already defined");

    if (typeof provider.then === "function")
      provider = promiseProvider(provider);
    else if (!isProvider(provider))
      provider = valueProvider(provider);
    else if (provider.callingConvention === INJECTED)
      provider = injectedProvider(provider);

    this.providers[name] = provider;
  },

  resolve: function(name, callback) {
    var injector = this,
        cache = injector.cache;

    if (name in cache) {
      callback.apply(null,cache[name]);
      return;
    }

    var resolveQueues = injector.resolveQueues,
        queue = resolveQueues[name];

    if (queue) {
      queue.push(callback);
      return;
    }

    var provider = getProvider(injector,name);
    if (!provider) {
      callback(new Error("Not provided"));
      return;
    }

    var parents = injector.parents;
    for (var p, i = 0, len = parents.length; i < len; i++) {
      p = parents[i];
      if (hasSameDependencyGraph(injector,p,name)) {
        p.resolve(name,resolvedInParent);
        return;
      }
    }

    queue = resolveQueues[name] = [callback];

    injector.invoke(provider,function(err, value) {
      cache[name] = [err, value];

      for (var i = 0, len = queue.length; i < len; i++)
        queue[i](err,value);

      delete resolveQueues[name];
    });

    function resolvedInParent(err, value) {
      cache[name] = [err, value];
      callback(err,value);
    }
  }
};


function getDependencies(f) {
  return f.dependencies || [];
}

function getProvider(injector, dependency) {
  var provider = injector.providers[dependency];
  if (provider)
    return provider;

  var parents = injector.parents;
  for (var i = 0, len = parents.length; i < len; i++) {
    provider = getProvider(parents[i],dependency);
    if (provider)
      return provider;
  }
}

function hasSameDependencyGraph(a, b, dependency) {
  var aProvider = getProvider(a,dependency),
      bProvider = getProvider(b,dependency);

  if (aProvider !== bProvider || !bProvider || !aProvider)
    return false;

  var dependencies = getDependencies(aProvider);

  for (var i = 0, len = dependencies.length; i < len; i++) {
    if (!hasSameDependencyGraph(a,b,dependencies[i]))
      return false;
  }

  return true;
}

function isProvider(f) {
  if (typeof f !== "function")
    return false;

  var cc = f.callingConvention;
  if (typeof cc !== "number")
    return false;

  return cc > 0 && cc < 6;
}

function normalizedApply(f, args, callback) {
  var cc = f.callingConvention;
  try {
    if (cc === IGNORE) {
      f.apply(null,args);
      callback();
    } else if (cc === ASYNC) {
      args = args.slice();
      args.push(callback);
      f.apply(null,args);
    } else if (cc === PROMISE) {
      f.apply(null,args)
        .then(function(value) {
          callback(null,value);
        },callback);
    } else {
      callback(null,f.apply(null,args));
    }
  } catch (err) {
    callback(err);
  }
}

function resolveDependencies(injector, f, callback) {
  var deps = getDependencies(f),
      depCount = deps.length,
      results = [];

  if (depCount === 0)
    return finish();

  var finished = false,
      outstanding = depCount;

  for (var i = 0; i < depCount; i++)
    resolve(i);

  function resolve(index) {
    var dep = deps[index];

    injector.resolve(dep,function(err, value) {
      if (finished) return;

      if (err) {
        finished = true;
        callback(new ProviderError(dep,err));
        return;
      }

      results[index] = value;

      outstanding--;
      if (outstanding === 0) {
        finished = true;
        finish();
      }
    });
  }

  function finish() {
    callback(null,results);
  }
}


function injectedProvider(f) {
  var args = getDependencies(f).slice();

  args.push(function() {
    var injectedArgs = slice.call(arguments);

    return function() {
      var args = injectedArgs.concat(slice.call(arguments));
      return f.apply(this,args);
    };
  });

  return fn.sync.apply(null,args);
}


function promiseProvider(promise) {
  return fn.async(function(callback) {
    promise.then(function(value) {
      callback(null,value);
    },function(err) {
      callback(err);
    });
  });
}


exports.value = valueProvider;

function valueProvider(value) {
  return fn.sync(function() {
    return value;
  });
}

})();
