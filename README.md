tinject
=======

tinject is a JavaScript dependency injection library. It's a bit like
async.auto, with some memoization magic, and support for promises.

It's small (~1.5KB minified and gzipped), has no dependencies, and works
in node.js or any reasonably modern browser (or it's a bug).

Setup
-----

In node.js, requiring the `tinject` module gets you the `di` object. In
the browser, the `di` object will be defined on `window`. In the browser
only, you can call `di.noConflict()` to restore the `di` variable to its
previous value. This function returns the `di` object, so you can save
it to a new variable of your choice.

To use the library, call `di.injector()` to get a new injector.

`di.injector` can be passed any number of other injectors as arguments.
Each is passed to `inherit` on the new injector.

Injector Methods
----------------

```js
injector.provide(name, provider);
```
Registers a new provider under the given name. If another provider has
already been registered for this name, an error is thrown.  See the
**Providers** section for more information about what the injector can
accept as a provider.

```js
injector.provide(object);
```
Calling the provide method with a single object will cause the injector
to iterate over the properties of the object, registering a new provider
for each `name`/`provider` pair.

```js
injector.resolve(name, callback);
```
Retrieves the value yielded by the named provider. `callback` is called
with an error if retrieval fails for any reason, otherwise it is called
with `null` followed by the yielded value.

```js
injector.invoke(fn, [extraArgs...,] callback);
```
Calls fn after resolving any dependencies it may have. Any additional
arguments passed to `invoke` are added to the arguments passed to `fn`.
`callback` is called with an error if `fn` raises an error, or if the
injector fails to resolve all of `fn`'s dependencies. Otherwise, it's
called with whatever result `fn` produces. `fn`'s dependencies, and the
manner in which it produces results, are controlled as they are for
provider functions. See **Providers** for details.

```js
injector.inject(fn, [extraArgs...]);
```
Returns a new function. This function accepts any number of extra
arguments, followed by a callback. When the returned function is
called, the extra arguments passed to it are appended to any extra
arguments that were passed to `inject`. `fn`, the extra arguments, and
the callback are then handled as if they were passed to `invoke` on the
same injector that received the `inject` call.

```js
injector.inherit(otherInjector);
```
Causes the injector to inherit from `otherInjector`. Injectors that
inherit from other injectors gain access to the providers of their
parents. They can also share values with their parents if they have an
identical dependency graph for a given name.

Injectors prefer providers in reverse order of calls to inherit. The
most recently inherited provider wins.

`examples/express.js` demonstrates one use of injector inheritance.

Providers
---------

tinject accepts several different kinds of providers. The simplest
provider is just a value. Any non-function, non-promise is treated as a
value automatically, and is passed untouched to anything that depends on
the name to which it is bound. If you want to be explicit, or if you
want to treat a function or a promise as a simple value, you can force
it by declaring your provider as `di.value(myValue)`.

When promises are used as providers, they are resolved, and the result
is the provided value. If the promise is rejected, the rejection is
treated as a provider error. Any provider with a `then` method is
treated as a promise automatically.

### Provider Functions

Provider functions are the most interesting, because they're the only
ones that can actually take dependencies. By default, a function's
return value is treated as the provided value, and it is called with no
arguments. An exception thrown by any provider function is treated as a
provider error.

To get more interesting behavior, a function needs to be annotated with
information about what it needs and how it produces results. This is
done by attaching properties to the provider function, and this is
easiest to do with some helper functions. Each of these helpers takes a
variable number of arguments. Each argument but the last is the name of
a dependency. The last argument is the function to be annotated.

Note that *all* of these functions return a function that has the same
behavior as the function they're given. You don't need an injector to
call them, and they can be unit tested the same way you'd test any other
function.

```js
di.fn.sync([dependencies...,] fn);
```
Sync providers use their return value as the provided value.

```js
di.fn.async([dependencies...,] fn);
```
Async providers receive a node.js-style callback function as their final
argument. If the callback is called with a truthy first argument, it's a
provider error. Otherwise, the second argument is treated as the
provided value.

```js
di.fn.promise([dependencies...,] fn);
```
Promise providers are expected to return a then-able when called. If it
resolves successfully, the resulting value is what is provided. If it is
rejected, the rejection is treated as a provider error.

```js
di.fn.ignore([dependencies...,] fn);
```
Functions that are annotated with `ignore` are evaluated for their side
effects only. If they return a value, it is discarded.

#### Immutable Annotators

The above functions modify and return the function they're given. This
is inappropriate for built-ins and other code the programmer doesn't
"own". Each di.fn function has a di.ifn (for "immutable") equivalent
that modifies and returns a newly-created proxy function rather than the
original.

These aren't the default because the proxy function causes a small
amount of overhead.

Examples
--------

```js
var injector = di.injector();

// Registers a provider under the name "foo". The simplest provider is
// just a value.
injector.provide("foo","FOO!");

// Registering multiple providers at once:
injector.provide({
  bar: function() {
    return "Bar!";
  },

  baz: di.fn.async(function(callback) {
    callback(null,"baz");
  }),

  foobar: di.fn.sync("foo","bar",function(foo, bar) {
    return foo + bar;
  })
});

// Resolves foo and bar in the process of resolving foobar.
injector.resolve("foobar",function(err, foobar) {
  console.log(foobar); // FOO!Bar!
});

// Invoked functions declare their dependencies the same way providers
// do, and they can yield values in multiple ways as well.
injector.invoke(di.fn.async("foo","bar","baz",
    function(foo, bar, baz, a, b, c, callback) {
  callback(null,foo + bar + baz + a + b + c);
}),"A","B","C",function(err, result) {
  console.log(result); // FOO!Bar!bazABC
});

// This is equivalent to the invoke example.
var myFn = injector.inject(di.fn.sync("foo","bar","baz",
    function(foo, bar, baz, a, b, c) {
  return foo + bar + baz + a + b + c;
}),"A","B");

myFn("C",function(err, result) {
  console.log(result); // FOO!Bar!bazABC
});
```
