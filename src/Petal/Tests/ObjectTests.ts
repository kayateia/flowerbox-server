/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

///<reference path="../../../typings/globals/jasmine/index.d.ts" />

import * as Petal from "../All";
import { TestSetup } from "./TestSetup";

describe("Object test", function() {
	it("should be able to wrap and unwrap objects", function() {
		let testobj = [{a:1}, {b:2}, {c:[3,4,5]}];
		let petalobj = Petal.ObjectWrapper.Wrap(testobj, null);
		let jsobj = Petal.ObjectWrapper.Unwrap(petalobj);
		expect(jsobj).toEqual(testobj);
	});

	it("should be able to provide custom equality and instanceof tests", function() {
		let test = new TestSetup("log(testobj === 5); log(5 === testobj); log (5 === 5);");

		let testobj: any = { equalTo: function(o) { return o === 5; } };
		test.runtime.currentScope.set("testobj", testobj);

		test.runProgram();

		expect(test.output).toEqual("true\ntrue\ntrue\n");


		test = new TestSetup("log(testobj instanceof 5); log(5 instanceof map);");
		testobj = { instanceOf: function(o) { return o === 5; } };
		test.runtime.currentScope.set("testobj", testobj);

		test.runProgram();

		expect(test.output).toEqual("true\nfalse\n");
	});
});
