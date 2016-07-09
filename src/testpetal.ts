"use strict";

import * as Petal from "./Petal/Petal";
import * as fs from "fs";

//var output = Parser.compileToTree(
var output = Petal.compileFromSource(
	"var a=5; if (a==5) { var b = 'test'; console.log('this rocks!'); } console.log('b value', b);"
	// "var a = [1,2,3]; console.log(a[1], a.indexOf, a['indexOf']);"
	// "var a = { b:5 }; console.log(a.b); a.b++; console.log(a.b);"
	// "log({ a:5, 'b':'c', d:{ e:1 }, f:[1,2,3] });"
	// "var a = 5; log(a < 5 ? 'nope' : 'works'); log(a === 5 ? 'works' : 'nope');"
	// "var a = 5; a += 5; log(a);"
	// "function a() { var b = 5; return (function() { log(b++); }); } var c = a(); c(); c();"
	// "for (var i=0; i<10; ++i) { log('test', i); }"
	// "(function(l,a,b,c) { l(c,b,a); return 5; l(c); })(log, 1, 2, 3);"
	// "function foo(a,b,c) { log(c,b,a); } foo(1,2,3);"
	// "var a=2, b=10, c='foo'; log(c); log(test()); log('after');"
	// "for (var i=0; i<10; ++i) { console.log('test', i); }"
	// "for (var i=0; i < (function () { log('inner i=', i); return i >= 10 ? 10 : i += 1 })(); i++) { log('i=', i); }"
	// "function testblob(#a, b, c) { return #a.baz+@cool.bar()+c; } testblob(1,2,'fooz'); (function() { console.log('boo!'); })();"
);
// console.log(JSON.stringify(output, null, 4));

console.log(output);

var runtime = new Petal.Runtime(true);

var log = function() {
	let args = [];
	for (let i=0; i<arguments.length; ++i)
		args.push(arguments[i]);
	console.log("LOG OUTPUT:", ...args);
};
runtime.currentScope().set("log", log);

let petalConsole: any = Object.create(null);
petalConsole.log = log;
runtime.currentScope().set("console", Petal.ObjectWrapper.WrapGeneric(petalConsole, ["log"]));

runtime.pushAction(Petal.Step.Node("Main program", output));
runtime.execute(1000);
console.log("Output scope:", runtime.currentScope());
