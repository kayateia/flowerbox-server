/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import * as Parser from "../Parser";
import { Runtime } from "../Runtime";
import { RuntimeException } from "../Exceptions";
import { StandardScope } from "../Scopes/StandardScope";
import { ConstScope } from "../Scopes/ConstScope";
import { Utils } from "../Utils";
import { Compiler } from "../Compiler";
import { Address } from "../Address";

// These are basic Petal library functions - for Petal code. A lot needs to be
// factored out of this module, but for now, this'll do.

let map = function(array, func) {
	var result = [];
	for (var i=0; i<array.length; ++i)
		result.push(func(array[i]));
	return result;
}

let filter = function(array, func) {
	var result = [];
	for (var i=0; i<array.length; ++i)
		if (func(array[i]))
			result.push(array[i]);
	return result;
}

export function registerAll(scope: ConstScope): void {
	let code = "var a = { map:" + map + ", filter:" + filter + "};";
	let ast = Parser.parseFromSource(code);
	let compiler = new Compiler("<lib>");
	compiler.compile(ast);
	let rt = new Runtime();
	let tempScope = new StandardScope(rt.currentScope);
	rt.pushScope(tempScope);
	rt.setInitialPC(new Address(0, compiler.module, ast));
	let result = rt.execute();
	if (result.outOfSteps)
		throw new RuntimeException("Ran out of steps while executing library code setup", null);
	let parsedFuncs = tempScope.get("a");
	for (let name of parsedFuncs.keys)
		scope.setConst(name, parsedFuncs.get(name));
}
