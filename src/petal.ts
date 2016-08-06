"use strict";

import * as Petal from "./Petal/All";
import * as fs from "fs";
const process = require("process");

if (process.argv.length < 3) {
	console.log("Usage: node petal.js script.petal");
	process.exit(0);
}

let parsems: number = Date.now();
let output;
try {
	output = Petal.parseFromSource(fs.readFileSync(process.argv[2]).toString());
	parsems = Date.now() - parsems;
	// console.log(JSON.stringify(output, null, 4));
} catch (e) {
	console.log(e);
}

var runtime = new Petal.Runtime(false);

var log = function() {
	let args = [];
	for (let i=0; i<arguments.length; ++i)
		args.push(arguments[i]);
	(<any>console.log)(...args);
};
runtime.currentScope.set("log", Petal.Address.Function(log));

let petalConsole: any = Object.create(null);
petalConsole.log = log;
runtime.currentScope.set("console", Petal.ObjectWrapper.WrapGeneric(petalConsole, ["log"]));

let compiler = new Petal.Compiler(process.argv[2]);
let compilems: number = Date.now();
compiler.compile(output);
compilems = Date.now() - compilems;

let runms: number = Date.now();
runtime.setInitialPC(new Petal.Address(0, compiler.module, output));
let results = runtime.execute();
runms = Date.now() - runms;
console.log("Command took", results.stepsUsed, "steps,", parsems, "ms to parse,", compilems, "ms to compile, and", runms, "ms to run.");
// console.log("Output scope:", runtime.currentScope());
