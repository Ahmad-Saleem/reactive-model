var ReactiveModel = require("../src/reactiveModel.js");
var encodeReactiveFunction = ReactiveModel.encodeReactiveFunction;
var encodeProperty = ReactiveModel.encodeProperty;
var dependencyGraph = ReactiveModel.dependencyGraph;

var assert = require("assert");

describe("reactive-model", function (){

  it("should be a function", function (){
    assert.equal(typeof ReactiveModel, "function");
  });

  it("should build the dependency graph", function (){
    var model = new ReactiveModel();

    // Dependency graph: a -> λ -> b
    // Encoded as: "0.a" -> "λ0" -> "0.b"
    var reactiveFunctions = model.react({
      b: ["a", function (a){}]
    });

    assert.equal(reactiveFunctions.length, 1);
    var λ = reactiveFunctions[0];

    assert.equal(model.id, 0);
    assert.equal(λ.id, 0);

    assert.equal(encodeReactiveFunction(λ), "λ0");
    assert.equal(encodeProperty(model, "a"), "0.a");
    assert.equal(encodeProperty(model, "b"), "0.b");

    assert.equal(dependencyGraph.adjacent("0.a").length, 1);
    assert.equal(dependencyGraph.adjacent("0.a")[0], "λ0");

    assert.equal(dependencyGraph.adjacent("λ0").length, 1);
    assert.equal(dependencyGraph.adjacent("λ0")[0], "0.b");
  });

  it("should enforce new", function (){
    var model1 = ReactiveModel();
    var model2 = new ReactiveModel();

    assert(model1 instanceof ReactiveModel);
    assert(model2 instanceof ReactiveModel);
  });
  

  //it("should react to single existing property", function (done){
  //  var model = new ReactiveModel();
  //  model.foo = "bar";
  //  model.react({

  //    // In the case of reactive functions that do not produce any output,
  //    // the destination property serves to document the function.
  //    // This way, every reactive model has its complete reactive flow declaratively mapped out,
  //    // so in the visualization of the reactive flow, every property node will have a meaningful name.
  //    testPass: ["foo", function (foo){
  //      assert.equal(foo, "bar");
  //      done();
  //    }]
  //  });
  //});
});

//var tape = require("tape"),
//    ReactiveModel = require("../lib/reactive-model");
//
//tape("react to single existing property", function (test){
//  var model = new ReactiveModel();
//
//  model.set({ x: "foo" });
//
//  test.plan(1);
//  model.react({
//    testOutput: ["x", function (x) {
//      test.equal(x, "foo");
//    }]
//  });
//});
//
//
////tape("react to single added property", function (test){
////  var model = new ReactiveModel();
////
////  test.plan(1);
////  model.react({
////    testOutput: ["x", function (x) {
////      test.equal(x, "foo");
////    }]
////  });
////
////  model.set({ x: "foo" });
////});
////
//
//var tape = require("tape"),
//    ReactiveModel = require("../lib/reactive-model");
//
//tape("set model properties", function (test){
//  var model = new ReactiveModel();
//  model.set({ x: "foo" });
//  test.equal(model.x, "foo");
//  test.end();
//});
//
//tape("set model property twice", function (test){
//  var model = new ReactiveModel();
//  model.set({ x: "foo" });
//  model.set({ x: "bar" });
//  test.equal(model.x, "bar");
//  test.end();
//});
//
//tape("set model property twice (variant A)", function (test){
//  var model = new ReactiveModel();
//  model.x = "foo";
//  model.set({ x: "bar" });
//  test.equal(model.x, "bar");
//  test.end();
//});
//
//tape("set model property twice (variant B)", function (test){
//  var model = new ReactiveModel();
//  model.set({ x: "foo" });
//  model.x = "bar";
//  test.equal(model.x, "bar");
//  test.end();
//});
