import * as Parser from "./Petal/Parser";
import { Step, Runtime } from "./Petal/Runtime";

//var output = Parser.compileToTree(
var output = Parser.compileFromSource(
	"var a=2, b=10, c='foo'; log(c);"
	// "for (var i=0; i<10; ++i) { console.log('test', i); }"
	// "for (var i=0; i < (function () { console.log('inner i=', i); return i >= 10 ? 10 : i += 1 })(); i++) { console.log('i=', i); }"
	// "function testblob(#a, b, c) { return #a.baz+@cool.bar()+c; } testblob(1,2,'fooz'); (function() { console.log('boo!'); })();"
);
// console.log(JSON.stringify(output, null, 4));

console.log(output);

var runtime = new Runtime();
runtime.pushAction(new Step(output, "Main program"));
runtime.execute(1000);
console.log("Output scope:", runtime.currentScope());
