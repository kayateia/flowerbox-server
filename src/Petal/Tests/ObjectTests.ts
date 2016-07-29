/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

///<reference path="../../../typings/globals/jasmine/index.d.ts" />

import * as Petal from "../Petal";
import { TestSetup } from "./TestSetup";

describe("Object test", function() {
	it("should be able to wrap and unwrap objects", function() {
		let testobj = [{a:1}, {b:2}, {c:[3,4,5]}];
		let petalobj = Petal.ObjectWrapper.Wrap(testobj, null);
		let jsobj = Petal.ObjectWrapper.Unwrap(petalobj);
		expect(jsobj).toEqual(testobj);
	});
});
