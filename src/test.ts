import Parser = require("./Parser");

//var output = Parser.compileToTree(
var output = Parser.compileFromSource(
	"for (var i=0; i<10; ++i) { console.log('test', i); }"
	// "for (var i=0; i < (function () { console.log('inner i=', i); return i >= 10 ? 10 : i += 1 })(); i++) { console.log('i=', i); }"
	// "function testblob(#a, b, c) { return #a.baz+@cool.bar()+c; } testblob(1,2,'fooz'); (function() { console.log('boo!'); })();"
);
console.log(JSON.stringify(output, null, 4));
