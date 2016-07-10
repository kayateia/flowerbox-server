/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

///<reference path="../../../typings/globals/jasmine/index.d.ts" />

import * as Petal from "../Petal";
import { TestSetup } from "./TestSetup";

// These aren't the most ideal set of tests, but they're designed to be a torture test gamut of
// random stuff I tried while developing Petal. More formal ones coming...

describe("Functional test", function() {
	it("should compile", function() {
		// This one isn't meant to run, just compile, to test out various Petal features that aren't in JavaScript.
		let program = "function testblob(#a, b, c) { return #a.baz+@cool.bar()+c; } testblob(1,2,'fooz'); (function() { console.log('boo!'); })();";
		let test = new TestSetup(program);

		// Not having an exception is good enough.
		expect(1).toEqual(1);
	});

	it("should handle basic for loops", function() {
		let program = "for (var i=0; i<5; ++i) { log('test', i); }";
		let test = new TestSetup(program);
		test.runProgram();

		expect(test.output).toEqual("test 0\ntest 1\ntest 2\ntest 3\ntest 4\n");
	});

	it("should handle complex expressions and for loops", function() {
		let program = "for (var i=0; i < (function () { log('inner i=', i); return i >= 5 ? 5 : i += 1 })(); i++) { log('i=', i); }";
		let test = new TestSetup(program);
		test.runProgram();

		expect(test.output).toEqual("inner i= 0\ni= 0\ninner i= 1\ni= 1\ninner i= 2\ni= 2\ninner i= 3\ni= 3\ninner i= 4\ni= 4\ninner i= 5\n");
	});

	it("can decl multiple variables, call external functions", function() {
		let program = "var a=2, b=10, c='foo'; log(c); log(test()); log('after');";
		let test = new TestSetup(program);
		test.runtime.currentScope().set("test", function() {
			return 5;
		});
		test.runProgram();

		expect(test.output).toEqual("foo\n5\nafter\n");
	});

	it("can define functions and call them", function() {
		let program = "function foo(a,b,c) { log(c,b,a); } foo(1,2,3);";
		let test = new TestSetup(program);
		test.runProgram();

		expect(test.output).toEqual("3 2 1\n");
	});

	it("should carry an enclosure with functions", function() {
		let program = "function a() { var b = 5; return (function() { log(b++); }); } var c = a(); c(); c();";
		let test = new TestSetup(program);
		test.runProgram();

		expect(test.output).toEqual("5\n6\n");
	});

	it("should have working function-as-value with enclosed scope", function() {
		let program = "(function(l,a,b,c) { var d=10; l(c,b,a); return 5; l(c); })(log, 1, 2, 3); log(d);";
		let test = new TestSetup(program);
		test.runProgram();

		expect(test.output).toEqual("3 2 1\nundefined\n");
	});

	it("should have a working update operator", function() {
		let program = "var a = 5; a += 5; log(a);";
		let test = new TestSetup(program);
		test.runProgram();

		expect(test.output).toEqual("10\n");
	});

	it("should have a working conditional operator", function() {
		let program = "var a = 5; log(a < 5 ? 'nope' : 'works'); log(a === 5 ? 'works' : 'nope');";
		let test = new TestSetup(program);
		test.runProgram();

		expect(test.output).toEqual("works\nworks\n");
	});

	it("should allow JSON style object construction", function() {
		let program = "log({ a:5, 'b':'c', d:{ e:1 }, f:[1,2,3] });";
		let test = new TestSetup(program);
		test.runProgram();

		expect(test.output).toEqual('{"a":5,"b":"c","d":{"e":1,"___petalObject":true},"f":[1,2,3],"___petalObject":true}\n');
	});

	it("should have working member access on JSON style objects", function() {
		let program = "var a = { b:5 }; log(a.b); a.b++; log(a.b); a.b += 4; log(a.b); a.b = 1; log(a.b);";
		let test = new TestSetup(program);
		test.runProgram();

		expect(test.output).toEqual("5\n6\n10\n1\n");
	});

	it("should allow for assignments to functions in objects", function() {
		let program = "var a = { b:5, c:function() { log(this.b, 'original'); } }; a.c(); a.c = function() { log(this.b, 'new'); }; a.c();";
		let test = new TestSetup(program);
		test.runProgram();

		expect(test.output).toEqual("5 original\n5 new\n");
	});

	it("should allow array creation and access", function() {
		let program = "var a = [1,2,3]; log(a[1], a.indexOf, a['indexOf']);";
		let test = new TestSetup(program);
		test.runProgram();

		expect(test.output).toEqual("2 <function> <function>\n");
	});

	it("shouldn't leak block scope", function() {
		let program = "var a=5; if (a==5) { var b = 'test'; log('this rocks!'); } log('b value', b);";
		let test = new TestSetup(program);
		test.runProgram();

		expect(test.output).toEqual("this rocks!\nb value undefined\n");
	});

	it("should have a working 'this' value", function() {
		let program = "var a = { bob: function() { log(this.bar); }, bar: 5 }; a.bob();";
		let test = new TestSetup(program);
		test.runProgram();

		expect(test.output).toEqual("5\n");
	});

	it("should properly nest 'this'", function() {
		let program = "var a = { bob: function() { log(this.bar); b.bob(); }, bar: 5 }; var b = { bob: function() { log(this.bar); }, bar: 10 }; a.bob();";
		let test = new TestSetup(program);
		test.runProgram();

		expect(test.output).toEqual("5\n10\n");
	});
});
