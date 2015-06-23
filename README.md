# reactive-model

A library for reactive models.

## Usage

Install via [NPM](https://www.npmjs.com/package/reactive-model):

`npm install reactive-model`

Require the package in your code:

`var ReactiveModel = require("reactive-model");`

Here is an example that demonstrates most of the features of this library.

```javascript
var model = new ReactiveModel();

model.react({
  fullName: [
    "firstName", "lastName", function (firstName, lastName){
      return firstName + " " + lastName;
    }
  ]
});

model
  .firstName("Jane")
  .lastName("Smith");

ReactiveModel.digest();

// Prints "Jane Smith"
console.log(model.fullName());
```

Here is a visual representation of the data dependency graph constructed in this example.
[![](http://curran.github.io/images/reactive-model/firstLastFlow.png)](http://bl.ocks.org/curran/5905182da50a4667dc00)

## API Reference

<a name="reactive-model" href="#reactive-model">#</a> <b>ReactiveModel</b>()

Constructs a new reactive model. The `new` keyword is optional.

Example use:
`var model = new ReactiveModel();`

<a name="react" href="#react">#</a> <i>react</i>(<i>options</i>)

Adds the given set of reactive functions to the data dependency graph. The `options` argument is an object where:

 * keys are output property names
 * values are arrays where:
   * all elements except the last one represent a list of input property names
   * the last element is the reactive function callback

For example, here is an invocation of `react` that sets the "b" property to be one greater than "a":

```javascript
model.react({
  b: ["a", function (a){
    return a + 1;
  }]
});
```

The reactive function callback is invoked with the values of input properties during a digest. This callback is only invoked if all input properties have defined values. If any of the input properties change, this callback will be invoked again in the next digest after the change.

The return value from the callback is assigned to the output property during a digest, which may be used as an input property to another reactive function. For example, here is a collection of two reactive functions that assign `b = a +1` and `c = b + 1`:

```javascript
function increment(x){ return x + 1; }
model.react({
  b: ["a", increment],
  c: ["b", increment]
});
```

If `a` is assigned to the value 1 and a digest occurs, the value of `c` after the digest will be 3.

## Glossary

 * "reactive model" The result of `new ReactiveModel()`.
 * "reactive function" A callback function and metadata that describes its input and output properties. A representation of set of reactive functions is passed into `model.react`.
 * "reactive function callback" The callback function portion of a reactive function.
 * "digest" An execution of the algorithm that evaluates the data dependency graph.
 * "evaluate" A term to denote complete resolution of the data dependency graph. After the complete data dependency graph has been **evaluated** by a digest, the state of the model is consistent with regard to its reactive functions, and all reactive functions that are transitively dependent on any changed property have been executed in the proper order, with their output values assigned to model properties.

## Development Flow

This project uses [Rollup](https://github.com/rollup/rollup) for bundling ES6 modules into a CommonJS build. The unit tests use the bundle. To re-generate the bundle and run the unit tests, execute

`make test`

To list all source files, run

`make tree`

## How it Works

This library maintains a graph data structure internally, called the "data dependency graph", in which

 * vertices represent either properties or reactive functions, and
 * edges represent a data dependency.

Whenever `react()` is called, nodes and edges are added to this data structure. Whenever a property is changed (via its getter-setter), that property is marked as changed.

The digest algorithm performs a depth first search using the changed property nodes as sources for the search. When visiting each reactive function node, a check is performed that ensures all of its input properties are defined. The resulting list of nodes visited by the depth first search algorithm is then reversed to obtain the topologically sorted order in which the reactive functions must be executed. After computing this ordering, each reactive function is executed, and its output value is assigned to its output property.

## Background

This is a re-design of [model.js](https://github.com/curran/model) that addresses the following issues:

 * The model.js syntax does not encode the data dependency graph explicitly, it is expressed implicitly by setting model property values within reactive functions (`model.when` callbacks).
 * The execution model of model.js uses `setTimeout` to queue evaluation of every single edge in the data dependency graph. This can have a performance impact, and can lead to inconsistent system state while the dependency graph is being evaluated. Let's say `setTimeout` takes about 4 ms to resolve. This means it would take 4 * d ms to evaluate any full data dependency graph, where d is the number of hops required through the data dependency graph (there must be some graph theory term for this..).

The core ideas of this redesign are:

 * data dependency graphs are specified explicitly (a lot like [Make](http://en.wikipedia.org/wiki/Make_%28software%29))
 * processing of changes is delayed until the next animation frame, so updates are synchronized with rendering
 * changes are processed (or "digested") using an explicit topological sort algorithm on the data dependency graph.

See also:

 * [ZJONSSON/clues](https://github.com/ZJONSSON/clues) A very similar library based on Promises.
 * [AngularJS Dependency Injection](https://docs.angularjs.org/guide/di) Inspired the API for reactive functions.
 * [AMD](http://requirejs.org/docs/whyamd.html#amd) Also inspired the API for reactive functions.
 * [Notes on Graph Algorithms Used in Optimizing Compilers](http://www.cs.umb.edu/~offner/files/flow_graph.pdf) Similar algorithms for flow graph analysis.

## Future Plans

This part is aspirational, not yet implemented. Following [readme-driven development](http://tom.preston-werner.com/2010/08/23/readme-driven-development.html).

For asynchronouos operations, the API should support returning a Promise from the reactive function callback. Here's an example that uses this API to fetch a CSV file using [d3.csv](https://github.com/mbostock/d3/wiki/CSV):

```javascript
var model = new ReactiveModel();

model.react({
  data: ["url", function (url){
    return new Promise(function (resolve, reject){
      d3.csv(url, function (error, data){
        if(error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
    });
  ]
});
```

A special default value `model.NONE` refers to a value that is defined, but represents that the property is optional and has not been speficied (similar conceptually to [Scala's Option Type](http://danielwestheide.com/blog/2012/12/19/the-neophytes-guide-to-scala-part-5-the-option-type.html).
