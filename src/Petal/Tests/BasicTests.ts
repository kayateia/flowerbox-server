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
	function basicTest(code, expected) {
		let test = new TestSetup(code);
		test.runProgram();

		expect(test.output).toEqual(expected);
	}

	it("should compile", function() {
		// This one isn't meant to run, just compile, to test out various Petal features that aren't in JavaScript.
		let program = "function testblob(#a, b, c) { return #a.baz+@cool.bar()+c; } testblob(1,2,'fooz'); (function() { console.log('boo!'); })();";
		let test = new TestSetup(program);

		// Not having an exception is good enough.
		expect(1).toEqual(1);
	});

	it("should have working math operators", function() {
		basicTest("var a = 4; log(Math.floor(((a+1)*4+5)/5) % 3);",
			"2\n");
	});

	it("should short circuit properly", function() {
		basicTest("var a = 5; if (a == 5 || log('no1')) log('yes1'); if (!(a != 5 && log('no2'))) log('yes2');",
			"yes1\nyes2\n");
	});

	it("should handle basic for loops", function() {
		basicTest("for (var i=0; i<5; ++i) { log('test', i); }",
			"test 0\ntest 1\ntest 2\ntest 3\ntest 4\n");
	});

	it("should handle complex expressions and for loops", function() {
		basicTest("for (var i=0; i < (function () { log('inner i=', i); return i >= 5 ? 5 : i += 1 })(); i++) { log('i=', i); }",
			"inner i= 0\ni= 1\ninner i= 2\ni= 3\ninner i= 4\ni= 5\ninner i= 6\n");
	});

	it("shouldn't leak for scope variables", function() {
		basicTest("for (var i=0; i<5; ++i) log(i); log(i);",
			"0\n1\n2\n3\n4\nundefined\n");
	});

	it("should handle basic for-in of arrays", function() {
		basicTest("var a=[1,2,3]; for (var i in a) log(i); log(i);",
			"1\n2\n3\nundefined\n");
	});

	it("should handle basic for-in of objects", function() {
		basicTest("var a={b:1,c:2,d:3}; for (var i in a) log(i); log(i);",
			"b\nc\nd\nundefined\n");
	});

	it("shouldn't consume input arrays in for-in", function() {
		basicTest("var a = [1,2,3]; for (var i in a) { if (i == 2) continue; log(i); } log(a);",
			"1\n3\n[1,2,3]\n");
	});

	it("should continue in for loops", function() {
		basicTest("for (var i=0; i<5; ++i) { if (i==2) continue; log(i); }",
			"0\n1\n3\n4\n");
	});

	it("should continue in for-in loops", function() {
		basicTest("for (var i in [1,2,3]) { if (i==2) continue; log(i); }",
			"1\n3\n");
	});

	it("should continue inside a single for-in loop", function() {
		basicTest("for (var i in [[1,2,3],[4,5,6]]) { for (var j in i) { if (j == 2) continue; log(j); } }",
			"1\n3\n4\n5\n6\n");
	});

	it("should break in for loops", function() {
		basicTest("for (var i=0; i<5; ++i) { if (i==2) break; log(i); }",
			"0\n1\n");
	});

	it("should break in for-in loops", function() {
		basicTest("for (var i in [1,2,3]) { if (i==2) break; log(i); }",
			"1\n");
	});

	it("can decl multiple variables, call external functions", function() {
		let program = "var a=2, b=10, c='foo'; log(c); log(test()); log('after');";
		let test = new TestSetup(program);
		test.runtime.currentScope.set("test", Petal.Address.Function(function() {
			return 5;
		}));
		test.runProgram();

		expect(test.output).toEqual("foo\n5\nafter\n");
	});

	it("can define functions and call them", function() {
		basicTest("function foo(a,b,c) { log(c,b,a); } foo(1,2,3);",
			"3 2 1\n");
	});

	it("should carry an enclosure with functions", function() {
		basicTest("function a() { var b = 5; return (function() { log(b++); }); } var c = a(); c(); c();",
			"5\n6\n");
	});

	it("should have working function-as-value with enclosed scope", function() {
		basicTest("(function(l,a,b,c) { var d=10; l(c,b,a); return 5; l(c); })(log, 1, 2, 3); log(d);",
			"3 2 1\nundefined\n");
	});

	it("should have working arrow functions", function() {
		basicTest("log(map([1,2,3], a => a+1));",
			"[2,3,4]\n");
	});

	it("should have a working update operator", function() {
		basicTest("var a = 5; a += 5; log(a);",
			"10\n");
	});

	it("should have a working conditional operator", function() {
		basicTest("var a = 5; log(a < 5 ? 'nope' : 'works'); log(a === 5 ? 'works' : 'nope');",
			"works\nworks\n");
	});

	it("should have working unary operators", function() {
		basicTest("var a = 5; if (!a) log('fail'); else log('works!');",
			"works!\n");
	});

	it("should allow JSON style object construction", function() {
		basicTest("log({ a:5, 'b':'c', d:{ e:1 }, f:[1,2,3] });",
			'{"a":5,"b":"c","d":{"e":1,"___petalObject":true},"f":[1,2,3],"___petalObject":true}\n');
	});

	it("should have working member access on JSON style objects", function() {
		basicTest("var a = { b:5 }; log(a.b); a.b++; log(a.b); a.b += 4; log(a.b); a.b = 1; log(a.b);",
			"5\n6\n10\n1\n");
	});

	it("should allow for assignments to functions in objects", function() {
		basicTest("var a = { b:5, c:function() { log(this.b, 'original'); } }; a.c(); a.c = function() { log(this.b, 'new'); }; a.c();",
			"5 original\n5 new\n");
	});

	it("should allow array creation and access", function() {
		basicTest("var a = [1,2,3]; log(a[1]); log(a.indexOf(2));",
			"2\n1\n");
	});

	it("shouldn't leak block scope", function() {
		basicTest("var a=5; if (a==5) { var b = 'test'; log('this rocks!'); } log('b value', b);",
			"this rocks!\nb value undefined\n");
	});

	it("should have a working 'this' value", function() {
		basicTest("var a = { bob: function() { log(this.bar); }, bar: 5 }; a.bob();",
			"5\n");
	});

	it("should properly nest 'this'", function() {
		basicTest("var a = { bob: function() { log(this.bar); b.bob(); }, bar: 5 }; var b = { bob: function() { log(this.bar); }, bar: 10 }; a.bob();",
			"5\n10\n");
	});

	it("should have a working 'caller' value", function() {
		basicTest("var a = { bob: function() { log(this.bar); b.bob(); }, bar: 5 }; var b = { bob: function() { log(this.bar); log(caller.bar); }, bar: 10 }; a.bob();",
			"5\n10\n5\n");
	});

	it("should successfully resume after an async function call", function(done) {
		let program = "var rv = test(); log('returned', rv);";
		let test = new TestSetup(program);
		test.runtime.currentScope.set("test", Petal.Address.Function(function() {
			return new Promise(complete => {
				setTimeout(() => {
					complete(5);
				}, 1);
			});
		}));
		test.runProgramAsync()
			.then(() => {
				expect(test.output).toEqual("returned 5\n");
				done();
			});
	});

	it("should successfully resume after an async method read", function(done) {
		let program = "log(test.foo);";
		let test = new TestSetup(program);
		test.runtime.currentScope.set("test", Petal.ObjectWrapper.WrapGeneric({
			foo: new Promise(s => setTimeout(s, 1)).then(() => "fooz!")
		}, ["foo"]));
		test.runProgramAsync()
			.then(() => {
				expect(test.output).toEqual("fooz!\n");
				done();
			})
			.catch(e => {
				console.log(e);
				expect(1).toEqual(2);
				done();
			});
	});

	it("should successfully resume after an async method read returns a promise as an l-value", function(done) {
		let program = "log(test.foo);";
		let test = new TestSetup(program);
		test.runtime.currentScope.set("test", {
			getAccessor: async function(index: any) {
				return new Petal.LValue("test.foo", r => "fooz!", () => {});
			}
		});
		test.runProgramAsync()
			.then(() => {
				expect(test.output).toEqual("fooz!\n");
				done();
			})
			.catch(e => {
				console.log(e);
				expect(1).toEqual(2);
				done();
			});
	});

	it("should have a working map", function() {
		basicTest("log(map([1,2,3], function(x) { return x + 1; }))",
			"[2,3,4]\n");
	});

	it("should have a working filter", function() {
		basicTest("log(filter([1,2,3], function(x) { return x < 3; }))",
			"[1,2]\n");
	});

	it("should have a switch statement", function() {
		basicTest("var a = 5; switch(a) { case 1: log(1); break; case 5: log(5); break; case 6: log(6); break; }",
			"5\n");
	});

	it("should have fall-through switch statements", function() {
		basicTest("var a = 5; switch(a) { case 1: log(1); break; case 5: log(5); case 6: log(6); break; }",
			"5\n6\n");
	});

	it("should allow injected values into function calls", function() {
		// Run once to get the function defined.
		let test = new TestSetup("function a() { log($, $foo); }");
		test.runProgram();

		// Run again to call the function. This simulates a function call from elsewhere.
		let func = test.runtime.currentScope.get("a");
		func.injections = { $: "test", $foo: "foo" };
		test.runtime.executeFunction(func, []);

		expect(test.output).toEqual("test foo\n");
	});
});
