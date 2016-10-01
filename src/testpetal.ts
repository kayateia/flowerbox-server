"use strict";

import * as Petal from "./Petal/All";
import * as fs from "fs";

let output;

/*let acorn = require("acorn");
console.log(acorn); */

try {
	output = Petal.parseFromSource(
		// "function test(a) { a += 'woot'; log('test!', a, (1+2) < (5*2)); } log('this is a test!');\nlog('this too!');\ntest('woot');\n"
		// "(function(a) { a += 'woot'; log(a); })('bar');"
		"try { throw 'test!'; log('went too far!'); } catch (err) { log(err); } log('after try/catch');"
		// "log(map([1,2,3], a => a+1));"
		// "var a = 5; if (a == 5 || log('no1')) log('yes1'); if (!(a != 5 && log('no2'))) log('yes2');"
		// "var a = [1,2,3]; for (var @i in a) { if (@i == 2) continue; log(@i); } log(a);"
		// "var a = ''; for (var i=0; i<5; ++i) a += 'a'; log(a);"
		// "for (var i=0; i<5; ++i) { if (i == 2) continue; log(i); }"
		// "for (var i=0; i<5; ++i) log(i); log(i);"
		// "var a=[1,2,3]; for (var i in a) log(i);"
		// "var verb = { a:{ b:[ 'foo', 'bar' ], c:function(){} } };"
		// "var a=5; if (a==5) { var b = 'test'; console.log('this rocks!'); } console.log('b value', b);"
		// "var a = [1,2,3]; console.log(a[1], a.indexOf, a['indexOf']);"
		// "var a = { b:5 }; console.log(a.b); a.b++; console.log(a.b);"
		// "log({ a:5, 'b':'c', d:{ e:1 }, f:[1,2,3] });"
		// "var a = 5; log(a < 5 ? 'nope' : 'works'); log(a === 5 ? 'works' : 'nope');"
		// "var a = 5; a += 5; log(a);"
		// "function a() { var b = 5; return (function() { log(b++); }); } var c = a(); c(); c();"
		// "for (var i=0; i<10; ++i) { log('test', i); }"
		// "(function(l,a,b,c) { var d=10; l(c,b,a); return 5; l(c); })(log, 1, 2, 3); log(d);"
		// "function foo(a,b,c) { log(c,b,a); } foo(1,2,3);"
		// "var a=2, b=10, c='foo'; log(c); log(test()); log('after');"
		// "for (var i=0; i<10; ++i) { console.log('test', i); }"
		// "for (var i=0; i < (function () { log('inner i=', i); return i >= 5 ? 5 : i += 1 })(); i++) { log('i=', i); }"
		// "function testblob(#a, b, c) { return #a.baz+@cool.bar()+c; } testblob(1,2,'fooz'); (function() { console.log('boo!'); })();"
	);
	// console.log(JSON.stringify(output, null, 4));
} catch (e) {
	console.log(e);
}

// console.log(output);

var runtime = new Petal.Runtime(false);

var log = function() {
	let args = [];
	for (let i=0; i<arguments.length; ++i)
		args.push(arguments[i]);
	console.log("LOG OUTPUT:", ...args);
};
runtime.currentScope.set("log", Petal.Address.Function(log));

/*let petalConsole: any = Object.create(null);
petalConsole.log = log;
runtime.currentScope().set("console", Petal.ObjectWrapper.WrapGeneric(petalConsole, ["log"])); */

/*runtime.pushAction(Petal.Step.Node("Main program", output));
runtime.execute(1000); */

let compiler = new Petal.Compiler("<test>");
compiler.compile(output);
let mod = compiler.module;
let i = 0;
for (let step of mod.program)
	console.log(i++, step);
runtime.setInitialPC(new Petal.Address(0, compiler.module, output));
runtime.execute();

// console.log("Output scope:", runtime.currentScope());
