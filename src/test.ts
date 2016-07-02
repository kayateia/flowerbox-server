///<reference path="../typings/globals/node/index.d.ts" />

import * as Parser from "./Petal/Parser";
import * as Runtime from "./Petal/Runtime";
import * as fs from "fs";

//var output = Parser.compileToTree(
var output = Parser.compileFromSource(
	// "for (var i=0; i<10; ++i) { log('test', i); }"
	"(function(l,a,b,c) { l(c,b,a); return 5; l(c); })(log, 1, 2, 3);"
	// "function foo(a,b,c) { log(c,b,a); } foo(1,2,3);"
	// "var a=2, b=10, c='foo'; log(c); log(test()); log('after');"
	// "for (var i=0; i<10; ++i) { console.log('test', i); }"
	// "for (var i=0; i < (function () { log('inner i=', i); return i >= 10 ? 10 : i += 1 })(); i++) { log('i=', i); }"
	// "function testblob(#a, b, c) { return #a.baz+@cool.bar()+c; } testblob(1,2,'fooz'); (function() { console.log('boo!'); })();"
);
// console.log(JSON.stringify(output, null, 4));

console.log(output);

var runtime = new Runtime.Runtime(true);

runtime.currentScope().set("log", function() {
	let args = [];
	for (let i=0; i<arguments.length; ++i)
		args.push(arguments[i]);
	console.log("LOG OUTPUT:", ...args);
});

runtime.currentScope().set("test", () => {
	fs.readFile('Gruntfile.js', 'utf8', function (err,data) {
		if (err) {
			return console.log(err);
		}
		console.log("Read the file contents");
		runtime.pushOperand(data);
		runtime.execute(1000);
	});
	throw Runtime.suspend;
});

runtime.pushAction(new Runtime.Step(output, "Main program"));
runtime.execute(1000);
console.log("Output scope:", runtime.currentScope());
