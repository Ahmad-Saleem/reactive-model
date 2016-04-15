(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ReactiveModel = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// By Curran Kelleher April 2016

var ReactiveFunction = require("reactive-function");
var ReactiveProperty = require("reactive-property");

// Functional utility for invoking methods on collections.
function invoke(method){
  return function(d){
    return d[method]();
  };
}

// The constructor for reactive models.
// This function is exported as the public API of this module.
function ReactiveModel(){

  // This object stores the default values for all public properties.
  // Keys are public property names.
  // Values are default values.
  var publicPropertyDefaults = {};

  // Returns an array of public property names.
  var publicPropertyNames = function (){
    return Object.keys(publicPropertyDefaults);
  }

  // The state of the model is represented as an object and stored
  // in this reactive property. Note that only values for public properties
  // whose values differ from their defaults are included in the state object.
  // The purpose of the state accessor API is serialization and deserialization,
  // so default values are left out for a concise serialized form.
  var stateProperty = ReactiveProperty();

  // This is a reactive function set up to listen for changes in all
  // public properties and set the stateProperty value.
  var stateReactiveFunction;

  // An array of reactive functions that have been set up on this model.
  // These are tracked only so they can be destroyed in model.destroy().
  var reactiveFunctions = [];

  // The model instance object.
  // This is the value returned from the constructor.
  var model = function (outputPropertyName, callback, inputsStr){

    // Support optional alternative arguments for no output property.
    // model(callback, inputsStr)
    if(arguments.length === 2){
      inputsStr = arguments[1];
      callback = arguments[0];
      outputPropertyName = undefined;
    }

    var inputPropertyNames = inputsStr.split(",").map(invoke("trim"));

    // TODO throw an error if a property is not on the model.
    var inputs = inputPropertyNames.map(getProperty);

    // Create a new reactive property for the output and assign it to the model.
    // TODO throw an error if the output property is already defined on the model.
    if(outputPropertyName){
      var output = ReactiveProperty();
      model[outputPropertyName] = output;
    }

    // If the number of arguments expected by the callback is one greater than the
    // number of inputs, then the last argument is the "done" callback, and this
    // reactive function will be set up to be asynchronous. The "done" callback should
    // be called with the new value of the output property asynchronously.
    var isAsynchronous = (callback.length === inputs.length + 1);
    if(isAsynchronous){
      reactiveFunctions.push(ReactiveFunction({
        inputs: inputs,
        callback: function (){

          // Convert the arguments passed into this function into an array.
          var args = Array.prototype.slice.call(arguments);

          // Push the "done" callback onto the args array.
          // We are actally passing the output reactive property here, invoking it
          // as the "done" callback will set the value of the output property.
          args.push(output);

          // Wrap in setTimeout to guarantee that the output property is set
          // asynchronously, outside of the current digest. This is necessary
          // to ensure that if developers inadvertently invoke the "done" callback 
          // synchronously, their code will still have the expected behavior.
          setTimeout(function (){

            // Invoke the original callback with the args array as arguments.
            callback.apply(null, args);
          });
        }
      }));
    } else {
      reactiveFunctions.push(ReactiveFunction({
        inputs: inputs,
        output: output,
        callback: callback
      }));
    }
    return model;
  };

  // Gets a reactive property from the model by name.
  // Convenient for functional patterns like `propertyNames.map(getProperty)`
  function getProperty(propertyName){
    return model[propertyName];
  }

  // Adds a property to the model that is not public,
  // meaning that it is not included in the state object.
  function addProperty(propertyName, defaultValue){
    model[propertyName] = ReactiveProperty(defaultValue);
    return model;

    // TODO throw an error if the name is not available (e.g. another property name, "state" or "addPublicProperty").
  }

  // Adds a public property to the model.
  // The property name is required and will be used to reference this property.
  // The default value is required to guarantee predictable behavior of the state accessor.
  function addPublicProperty(propertyName, defaultValue){

    // TODO test this
    // if(!isDefined(defaultValue)){
    //  throw new Error("model.addPublicProperty() is being " +
    //    "invoked with an undefined default value. Default values for public properties " +
    //    "must be defined, to guarantee predictable behavior. For public properties that " +
    //    "are optional and should have the semantics of an undefined value, " +
    //    "use null as the default value.");
    //}

    addProperty(propertyName, defaultValue);

    // Store the default value for later reference.
    publicPropertyDefaults[propertyName] = defaultValue;

    // Destroy the previous reactive function that was listening for changes
    // in all public properties except the newly added one.
    // TODO think about how this might be done only once, at the same time isFinalized is set.
    if(stateReactiveFunction){
      stateReactiveFunction.destroy();
    }

    // Set up the new reactive function that will listen for changes
    // in all public properties including the newly added one.
    var inputPropertyNames = publicPropertyNames();
    stateReactiveFunction = ReactiveFunction({
      inputs: inputPropertyNames.map(getProperty),
      output: stateProperty,
      callback: function (){
        var state = {};
        inputPropertyNames.forEach(function (propertyName){
          var value = model[propertyName]();
          var defaultValue = publicPropertyDefaults[propertyName];

          // Omit default values from the returned state object.
          if(value !== defaultValue){
            state[propertyName] = value;
          }
        });
        return state;
      }
    });

    // Support method chaining.
    return model;
  }

  // Adds multiple public properties to the model.
  // Takes an object literal where keys are public property names
  // and values are their default values.
  function addPublicProperties(options){
    Object.keys(options).forEach(function (propertyName){
      var defaultValue = options[propertyName];
      addPublicProperty(propertyName, defaultValue);
    });
    return model;
  }

  // Adds multiple properties to the model.
  // Takes an object literal where keys are public property names
  // and values are their default values.
  function addProperties(options){
    Object.keys(options).forEach(function (propertyName){
      var defaultValue = options[propertyName];
      addProperty(propertyName, defaultValue);
    });
    return model;
  }

  function setState(newState){

    // TODO throw an error if some property in state
    // is not in publicProperties
    //Object.keys(state).forEach(function (property){
    //  if(!property in publicPropertyDefaults){
    //    throw new Error("Attempting to set a property that has not" +
    //      " been added as a public property in model.state(newState)");
    //  }
    //});

    publicPropertyNames().forEach(function (propertyName){
      var oldValue = model[propertyName]();

      var newValue;
      if(propertyName in newState){
        newValue = newState[propertyName];
      } else {
        newValue = publicPropertyDefaults[propertyName];
      }

      if(oldValue !== newValue){
        model[propertyName](newValue);
      }
    });
  }

  // Destroys all reactive functions that have been added to the model.
  function destroy(){
    
    reactiveFunctions.forEach(invoke("destroy"));

    // TODO destroy all properties on the model, remove their listeners and nodes in the graph.

    // TODO test bind case
  }

  // This is the public facing wrapper around stateProperty.
  // This is necessary to enforce the policy that no public properties
  // may be added after the state has been get or set from the public API.
  // This is required to guarantee predictable state accessor behavior.
  function stateAccessor(newState){

    // Invoke the setState logic only when the state is set via the public API.
    if(arguments.length == 1){
      setState(newState);
    }

    // Pass through the getter/setter invocation to stateProperty.
    return stateProperty.apply(model, arguments);
  }
  stateAccessor.on = stateProperty.on;

  // TODO add a test for this.
  stateAccessor.off = stateProperty.off;

  model.addProperty = addProperty;
  model.addProperties = addProperties;
  model.addPublicProperty = addPublicProperty;
  model.addPublicProperties = addPublicProperties;
  model.state = stateAccessor;
  model.destroy = destroy;

  return model;
}

ReactiveModel.digest = ReactiveFunction.digest;

module.exports = ReactiveModel;

},{"reactive-function":3,"reactive-property":4}],2:[function(require,module,exports){
// A graph data structure with depth-first search and topological sort.
module.exports = function Graph(){
  
  // The adjacency list of the graph.
  // Keys are node ids.
  // Values are adjacent node id arrays.
  var edges = {};

  // Adds a node to the graph.
  // If node was already added, this function does nothing.
  // If node was not already added, this function sets up an empty adjacency list.
  function addNode(node){
    edges[node] = adjacent(node);
  }

  // Removes a node from the graph.
  // Also removes incoming and outgoing edges.
  function removeNode(node){
    
    // Remove incoming edges.
    Object.keys(edges).forEach(function (u){
      edges[u].forEach(function (v){
        if(v === node){
          removeEdge(u, v);
        }
      });
    });

    // Remove outgoing edges (and signal that the node no longer exists).
    delete edges[node];
  }

  // Gets the list of nodes that have been added to the graph.
  function nodes(){
    var nodeSet = {};
    Object.keys(edges).forEach(function (u){
      nodeSet[u] = true;
      edges[u].forEach(function (v){
        nodeSet[v] = true;
      });
    });
    return Object.keys(nodeSet);
  }

  // Gets the adjacent node list for the given node.
  // Returns an empty array for unknown nodes.
  function adjacent(node){
    return edges[node] || [];
  }

  // Adds an edge from node u to node v.
  // Implicitly adds the nodes if they were not already added.
  function addEdge(u, v){
    addNode(u);
    addNode(v);
    adjacent(u).push(v);
  }

  // Removes the edge from node u to node v.
  // Does not remove the nodes.
  // Does nothing if the edge does not exist.
  function removeEdge(u, v){
    if(edges[u]){
      edges[u] = adjacent(u).filter(function (_v){
        return _v !== v;
      });
    }
  }

  // Depth First Search algorithm, inspired by
  // Cormen et al. "Introduction to Algorithms" 3rd Ed. p. 604
  // This variant includes an additional option 
  // `includeSourceNodes` to specify whether to include or
  // exclude the source nodes from the result (true by default).
  // If `sourceNodes` is not specified, all nodes in the graph
  // are used as source nodes.
  function depthFirstSearch(sourceNodes, includeSourceNodes){

    if(!sourceNodes){
      sourceNodes = nodes();
    }

    if(typeof includeSourceNodes !== "boolean"){
      includeSourceNodes = true;
    }

    var visited = {};
    var nodeList = [];

    function DFSVisit(node){
      if(!visited[node]){
        visited[node] = true;
        adjacent(node).forEach(DFSVisit);
        nodeList.push(node);
      }
    }

    if(includeSourceNodes){
      sourceNodes.forEach(DFSVisit);
    } else {
      sourceNodes.forEach(function (node){
        visited[node] = true;
      });
      sourceNodes.forEach(function (node){
        adjacent(node).forEach(DFSVisit);
      });
    }

    return nodeList;
  }

  // The topological sort algorithm yields a list of visited nodes
  // such that for each visited edge (u, v), u comes before v in the list.
  // Amazingly, this comes from just reversing the result from depth first search.
  // Cormen et al. "Introduction to Algorithms" 3rd Ed. p. 613
  function topologicalSort(sourceNodes, includeSourceNodes){
    return depthFirstSearch(sourceNodes, includeSourceNodes).reverse();
  }
  
  return {
    addNode: addNode,
    removeNode: removeNode,
    nodes: nodes,
    adjacent: adjacent,
    addEdge: addEdge,
    removeEdge: removeEdge,
    depthFirstSearch: depthFirstSearch,
    topologicalSort: topologicalSort
  };
}

},{}],3:[function(require,module,exports){
var ReactiveProperty = require("reactive-property");
var Graph = require("graph-data-structure");

// Use requestAnimationFrame if it is available.
// Otherwise fall back to setTimeout.
var nextFrame = setTimeout;
if(typeof requestAnimationFrame !== 'undefined') {
  nextFrame = requestAnimationFrame;
}

// The singleton data dependency graph.
// Nodes are reactive properties.
// Edges are dependencies between reactive function inputs and outputs.
var graph = Graph();

// A map for looking up properties based on their assigned id.
// Keys are property ids, values are reactive properties.
var properties = {};

// This object accumulates properties that have changed since the last digest.
// Keys are property ids, values are truthy (the object acts like a Set).
var changed = {};

// Assigns an id to a reactive property so it can be a node in the graph.
// Also stores a reference to the property by id in `properties`.
// If the given property already has an id, does nothing.
var assignId = (function(){
  var counter = 1;
  return function (property){
    if(!property.id){
      property.id = counter++;
      properties[property.id] = property;
    }
  };
}());

// The reactive function constructor.
// Accepts an options object with
//  * inputs - An array of reactive properties.
//  * callback - A function with arguments corresponding to values of inputs.
//  * output - A reactive property (optional).
function ReactiveFunction(options){

  var inputs = options.inputs;
  var callback = options.callback;
  var output = options.output || function (){};

  // This gets invoked during a digest, after inputs have been evaluated.
  output.evaluate = function (){

    // Get the values for each of the input reactive properties.
    var values = inputs.map(function (input){
      return input();
    });

    // If all input values are defined,
    if(defined(values)){

      // invoke the callback and assign the output value.
      output(callback.apply(null, values));
    }

  };

  // Assign node ids to inputs and output.
  assignId(output);
  inputs.forEach(assignId);

  // Set up edges in the graph from each input.
  inputs.forEach(function (input){
    graph.addEdge(input.id, output.id);
  });

  // Add change listeners to each input property.
  // These mark the properties as changed and queue the next digest.
  var listeners = inputs.map(function (property){
    return property.on(function (){
      changed[property.id] = true;
      queueDigest();
    });
  });

  // Return an object that can destroy the listeners and edges set up.
  return {

    // This function must be called to explicitly destroy a reactive function.
    // Garbage collection is not enough, as we have added listeners and edges.
    destroy: function (){

      // Remove change listeners from inputs.
      listeners.forEach(function (listener, i){
        inputs[i].off(listener);
      });

      // Remove the edges that were added to the dependency graph.
      inputs.forEach(function (input){
        graph.removeEdge(input.id, output.id);
      });

      // Remove the reference to the 'evaluate' function.
      delete output.evaluate;

    }
  };
}

// Propagates changes through the dependency graph.
ReactiveFunction.digest = function (){

  graph
    .topologicalSort(Object.keys(changed), false)
    .map(function (id){
      return properties[id];
    })
    .forEach(function (property){
      property.evaluate();
    });

  changed = {};
};

// This function queues a digest at the next tick of the event loop.
var queueDigest = debounce(ReactiveFunction.digest);

// Returns a function that, when invoked, schedules the given function
// to execute once on the next frame.
// Similar to http://underscorejs.org/#debounce
function debounce(callback){
  var queued = false;
  return function () {
    if(!queued){
      queued = true;
      nextFrame(function () {
        queued = false;
        callback();
      }, 0);
    }
  };
}

// Returns true if all elements of the given array are defined.
function defined(arr){
  return !arr.some(isUndefined);
}

// Returns true if the given object is undefined.
// Returns false if the given object is some value, including null.
// Inspired by http://ryanmorr.com/exploring-the-eternal-abyss-of-null-and-undefined/
function isUndefined(obj){
  return obj === void 0;
}

ReactiveFunction.nextFrame = nextFrame;

module.exports = ReactiveFunction;

},{"graph-data-structure":2,"reactive-property":4}],4:[function(require,module,exports){
// UMD boilerplate (from Rollup)
(function (global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() :
  typeof define === "function" && define.amd ? define(factory) : (global.ReactiveProperty = factory());
}(this, function () { "use strict";

  // Error messages for exceptions thrown.
  var errors = {
    tooManyArgsConstructor: "ReactiveProperty(value) accepts only a single argument, the initial value.",
    tooManyArgsSetter: "reactiveProperty(newValue) accepts only a single argument, the new value.",
    onNonFunction: "ReactiveProperty.on(listener) only accepts functions, not values.",
    onArgs: "ReactiveProperty.on(listener) accepts exactly one argument, the listener function."
  };

  // This function generates a getter-setter with change listeners.
  return function ReactiveProperty(value){

    // An array of registered listener functions.
    var listeners;
    
    // Check for too many arguments.
    if(arguments.length > 2) {
      throw Error(errors.tooManyArgsConstructor);
    }

    // This is the reactive property function that gets returned.
    function reactiveProperty(newValue){
    
      // Check for too many arguments.
      if(arguments.length > 1) {
        throw Error(errors.tooManyArgsSetter);
      }
      
      // This implements the setter part of the setter-getter.
      if(arguments.length === 1){

        // Track the new value internally.
        value = newValue;

        // Notify registered listeners.
        if(listeners){
          for(var i = 0; i < listeners.length; i++){
            listeners[i](value);
          }
        }

        // Support method chaining by returning 'this'.
        return this;
      }

      // This implements the getter part of the setter-getter.
      return value;
    }

    // Registers a new listener to receive updates.
    reactiveProperty.on = function (listener){

      // Check for invalid types.
      if(typeof listener !== "function"){
        throw Error(errors.onNonFunction);
      }

      // Check for wrong number of arguments.
      if(arguments.length > 1 || arguments.length === 0){
        throw Error(errors.onArgs);
      }

      // If no listeners have been added yet, initialize the array.
      if(!listeners){
        listeners = [];
      }

      // Register the listener.
      listeners.push(listener);

      // If there is an initial value, invoke the listener immediately.
      // null is considered as a defined value.
      if(value !== void 0){
        listener(value);
      }

      // For convenience, the listener is returned.
      return listener;
    };

    // Unregisters the given listener function.
    reactiveProperty.off = function (listenerToRemove){
      if(listeners){
        listeners = listeners.filter(function (listener){
          return listener !== listenerToRemove;
        });
      }
    };

    return reactiveProperty;
  }
}));

},{}]},{},[1])(1)
});