/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/
"use strict";
///<reference path="../typings/globals/node/index.d.ts" />

/*
import * as Parser from "./Petal/Parser";
import * as Runtime from "./Petal/Runtime";
import { SuspendException } from "./Petal/Exceptions";
import * as fs from "fs";

//var output = Parser.compileToTree(
var output = Parser.compileFromSource(
	"var a=5; if (a==5) { console.log('this rocks!'); }"
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

var runtime = new Runtime.Runtime(true);

var log = function() {
	let args = [];
	for (let i=0; i<arguments.length; ++i)
		args.push(arguments[i]);
	console.log("LOG OUTPUT:", ...args);
};
runtime.currentScope().set("log", log);

runtime.currentScope().set("test", () => {
	fs.readFile('Gruntfile.js', 'utf8', function (err,data) {
		if (err) {
			return console.log(err);
		}
		console.log("Read the file contents");
		runtime.pushOperand(data);
		runtime.execute(1000);
	});
	throw new SuspendException();
});

let petalConsole: any = Object.create(null);
petalConsole.log = log;
runtime.currentScope().set("console", petalConsole);

runtime.pushAction(new Runtime.Step(output, "Main program"));
runtime.execute(1000);
console.log("Output scope:", runtime.currentScope()); */


/*let re1 = [
	"^(throw) (hammer) (at|to|toward) (hammer|teacup|dog who was put in a kennel)$",
	"^(use) (hammer) (on) (hammer|teacup|dog who was put in a kennel)$"
];
let re2 = [
	"^(drink) (from|out of|from inside) (teacup)$",
	"^(drop) (teacup)$"
];
let dogname = "dog(?: who(?: was(?: put(?: in(?: a(?: kennel)?)?)?)?)?)?";
let re3 = [
	"^(release) (" + dogname + ")$",
	"^(put) (" + dogname + ") (in|inside|into|within) (hammer|teacup|" + dogname + ")$"
];
let objre = [
	re1, re2, re3
]; */

/*function makeMatches(text) {
	let matches = [];
	for (let i=0; i<objre.length; ++i) {
		let res = objre[i];
		for (let j=0; j<res.length; ++j) {
			let regex = new RegExp(res[j], "gi");
			let match = regex.exec(text);
			if (match !== null)
				matches.push(match);
		}
	}

	return matches;
}

let testPhrase = "put dog who was put in a kennel into teacup";
// let testPhrase = "put dog into teacup";
console.log(makeMatches(testPhrase)); */



/*let alternates: any = {
	"with":			[ "with", "using" ],
	"at":			[ "at", "to", "toward" ],
	"in":			[ "in", "inside", "into", "within" ],
	"on":			[ "on", "on top of", "onto", "upon", "above", "over" ],
	"from":			[ "from", "out of", "from inside" ],
	"through":		[ "through" ],
	"under":		[ "under", "underneath", "beneath" ],
	"behind":		[ "behind" ],
	"infrontof":	[ "in front of" ],
	"beside":		[ "beside" ],
	"for":			[ "for", "about" ],
	"is":			[ "is" ],
	"as":			[ "as" ],
	"around":		[ "around" ],
	"off":			[ "off", "off of", "away from" ]
};

// Hammer
let obj1 = {
	id: 1,
	name: "Hammer",
	verblines: [
		"throw self at any",
		"use self on any"
	]
};

let obj2 = {
	id: 2,
	name: "Teacup",
	verblines: [
		"drink none from self",
		"drop self"
	]
};

let obj3 = {
	id: 3,
	name: "Dog who was put in a kennel",
	verblines: [
		"release self",
		"put self in any"
	]
};

let obj4 = {
	id: 4,
	name: "Human person",
	verblines: [
		"pet self"
	]
};

let allObjects = [ obj1, obj2, obj3, obj4 ];
let roomObjects = [ obj1, obj2, obj3 ];

function parseVerbLine(line: string) {
	let result: any = {};
	let pieces = line.split(/\s+/);
	result.verb = pieces[0];
	if (pieces[1])
		result.dobj = pieces[1];
	if (pieces[2])
		result.prep = pieces[2];
	if (pieces[3])
		result.indobj = pieces[3];

	return result;
}

// http://stackoverflow.com/a/6969486
function escapeRegExp(str: string): string {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function createTargetRegex(target: string): string {
	let words: string[] = target.split(/\s+/);
	let re = escapeRegExp(words[0]), ending = "";
	for (let i=1; i<words.length; ++i) {
		re += "(?:\\s+" + escapeRegExp(words[i]);
		ending += ")?";
	}
	return re + ending;
}

function createTargetsRegex(objs: any[], extras: string[]): string {
	let repieces: string[] = [];
	objs.forEach((obj) => {
		repieces.push(createTargetRegex(obj.name));
	});
	extras.forEach((name) => {
		repieces.push(createTargetRegex(name));
	});

	if (!repieces.length)
		return null;
	else
		return "(" + repieces.join("|") + ")";
}

function parseVerbLines(obj: any, roomObjs: any[], otherObjs: any[], selfRef?: string): string[] {
	let parsedLines = [];
	if (!selfRef)
		selfRef = obj.name;
	obj.verblines.forEach((l) => {
		let parsed = parseVerbLine(l);
		let re = "^(" + parsed.verb + ")";
		if (parsed.dobj) {
			if (parsed.dobj === "any")
				re += " " + createTargetsRegex(roomObjects, []);
			else if (parsed.dobj === "self")
				re += " (" + createTargetRegex(selfRef) + ")";
			else if (parsed.dobj === "none")
				re += "()";
		}
		if (parsed.prep) {
			let alts = alternates[parsed.prep];
			re += " (" + alts.join("|") + ")";
		}
		if (parsed.indobj) {
			if (parsed.indobj === "any")
				re += " " + createTargetsRegex(roomObjects, []);
			else if (parsed.indobj === "self")
				re += " (" + createTargetRegex(selfRef) + ")";
			else if (parsed.dobj === "none")
				re += "()";
		}

		parsedLines.push(re + "$");
	});

	return parsedLines;
}

let allregexes: string[] = [];

roomObjects.forEach((obj) => {
	let adds = parseVerbLines(obj, roomObjects, [obj4]);
	allregexes.push(...adds);
});
(function() {
	let adds = parseVerbLines(obj4, roomObjects, [], "#4");
	allregexes.push(...adds);
})();

// console.log(parseVerbLines(roomObjects[0], roomObjects, [obj4]));
console.log(allregexes);


function makeMatches(text) {
	let matches = [];
	for (let i=0; i<allregexes.length; ++i) {
		let regex = new RegExp(allregexes[i], "gi");
		let match = regex.exec(text);
		if (match !== null)
			matches.push(match);
	}

	return matches;
} */


import { Wob } from "./World/Wob";
import { Verb } from "./World/Verb";
import { World } from "./World/World";
import * as InputParser from "./World/InputParser";
import * as readline from "readline";

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

async function tester() {
	let world = new World();
	// console.log(JSON.stringify(world, null, 4));

	let wobs = await world.getWobs([2]);
	console.log("Got a wob");
	(function nextLine() {
		rl.question('> ', (answer) => {
			InputParser.parseInput(answer, wobs[0], world)
				.then(() => {
					// console.log(makeMatches(answer));
					// console.log(answer);
					nextLine();
				});
		});
	})();
}

tester()
	.catch(err => {
		console.log(err);
	});
