import Parser = require("./Parser");

var output = Parser.compileFromSource(
	"for (var i=0; i<10; ++i) { console.log('test', i); }"
	// "function testblob(#a, b, c) { return #a.baz+@cool.bar()+c; } testblob(1,2,'fooz'); (function() { console.log('boo!'); })();"
);
console.log(JSON.stringify(output, null, 4));
