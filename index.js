var _ = require("lodash");

var fn = exports.fn = {},
    ifn = exports.ifn = {},
    copyLast = _.compose(_.partial,_.last);

var IGNORE  = fn.IGNORE  = 1,
    SYNC    = fn.SYNC    = 2,
    ASYNC   = fn.ASYNC   = 3,
    PROMISE = fn.PROMISE = 4;

_.each({
  ignore: IGNORE,
  sync: SYNC,
  async: ASYNC,
  promise: PROMISE
},function(code, cc) {
  fn[cc] = annotator(code,_.last);
  ifn[cc] = annotator(code,copyLast);
});

function annotator(callingConvention, extractor) {
  return function(/* dependencies..., f */) {
    var f = extractor(arguments);

    f.callingConvention = callingConvention;
    f.dependencies = _.initial(arguments);
    
    return f;
  };
}


exports.value = valueProvider;


exports.ProviderError = ProviderError;

function ProviderError(dependency, error) {
  this.dependency = dependency;
  this.name = "ProviderError";
  this.error = error;
  this.message = dependency + ": " + (error.message || error.toString());
  Error.captureStackTrace(this,ProviderError);
}

ProviderError.prototype = new Error();


exports.injector = function(/* parents... */) {
  var i = new Injector();

  _.each(arguments,function(p) {
    i.inherit(p);
  });

  return i;
};

exports.Injector = Injector;

function Injector() {
  this.parents = [];
  this.cache = {};
  this.providers = {};
  this.resolveQueues = {};
}

Injector.prototype = {
  inherit: function(other) {
    this.parents.unshift(other);
  },

  inject: function(/* f, extraArgs... */) {
    var args = _.toArray(arguments);

    args.unshift(_.bindKey(this,"invoke"));

    return _.partial.apply(_,args);
  },

  invoke: function(f/*, extraArgs..., callback */) {
    var i = this,
        extraArgs = _.initial(_.rest(arguments)),
        callback = _.last(arguments);

    resolveDependencies(i,f,function(err, args) {
      if (err)
        callback(err);
      else
        normalizedApply(f,args.concat(extraArgs),callback);
    });
  },

  provide: function(name, provider) {
    if (arguments.length === 1) {
      _.forIn(name,function(realProvider, realName) {
        this.provide(realName,realProvider);
      },this);

      return;
    }

    if (name in this.providers)
      throw new Error(name + ": Provider already defined");

    if (provider.then)
      provider = promiseProvider(provider);
    else if (!_.isFunction(provider))
      provider = valueProvider(provider);

    this.providers[name] = provider;
  },

  resolve: function(name, callback) {
    var i = this,
        cache = i.cache;

    if (name in cache) {
      callback.apply(null,cache[name]);
      return;
    }

    var resolveQueues = i.resolveQueues,
        queue = resolveQueues[name];

    if (queue) {
      queue.push(callback);
      return;
    }

    var provider = getProvider(i,name);
    if (!provider)
      throw new Error("Not provided");

    var parentWithSameGraph = _.find(i.parents,function(p) {
      return hasSameDependencyGraph(i,p,name);
    });

    if (parentWithSameGraph) {
      parentWithSameGraph.resolve(name,callback);
      return;
    }

    queue = resolveQueues[name] = [callback];

    i.invoke(provider,function(err, value) {
      cache[name] = [err, value];

      _.each(queue,function(f) {
        f(err,value);
      });

      delete resolveQueues[name];
    });
  }
};


function getDependencies(f) {
  return f.dependencies || [];
}

function getProvider(injector, dependency) {
  var provider = injector.providers[dependency];
  if (provider)
    return provider;

  _.each(injector.parents,function(p) {
    provider = getProvider(p,dependency);
    if (provider)
      return false;
  });

  return provider;
}

function hasSameDependencyGraph(a, b, dependency) {
  var aProvider = getProvider(a,dependency),
      bProvider = getProvider(b,dependency);

  if (aProvider !== bProvider)
    return false;

  var dependencies = getDependencies(aProvider);

  return _.all(dependencies,function(d) {
    return hasSameDependencyGraph(a,b,d);
  });
}

function normalizedApply(f, args, callback) {
  var cc = f.callingConvention;
  try {
    if (cc === IGNORE) {
      f.apply(this,args);
      callback();
    } else if (cc === ASYNC) {
      args = args.slice();
      args.push(callback);
      f.apply(this,args);
    } else if (cc === PROMISE) {
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


function promiseProvider(promise) {
  return fn.async(function(callback) {
    promise.then(function(value) {
      callback(null,value);
    },function(err) {
      callback(err);
    });
  });
}

function valueProvider(value) {
  return function() {
    return value;
  };
}
