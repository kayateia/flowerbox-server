/*
	Flowerbox
	Copyright (C) 2016 Kayateia, Dove
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { Verb, VerbSig } from "./Verb";
import { Wob, WobProperties } from "./Wob";
import { World } from "./World";
import * as Strings from "../Strings";

/*
This is a simple natural language parser. It looks in the user's current room for objects
that the user might be referring to, and also considers matches involving #x and @foo
references, as well as abbreviated versions of the object names. A set of regular
expressions is created, representing each verb, and the user's input is tested against
them until a match is found. The user's words are then fit into a template and passed
into the executing verb code.
*/

let alternates: any = {
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

function createTargetsRegex(objs: Wob[], extras: string[]): string {
	let repieces: string[] = [];
	objs.forEach((obj) => {
		repieces.push(createTargetRegex(obj.getProperty(WobProperties.Name)));
	});
	extras.forEach((name) => {
		repieces.push(createTargetRegex(name));
	});

	if (!repieces.length)
		return null;
	else
		return "(" + repieces.join("|") + ")";
}

export class ReMatch {
	constructor(re: string, wob: Wob, verb: Verb) {
		this.re = re;
		this.wob = wob;
		this.verb = verb;
	}
	public re: string;
	public wob: Wob;
	public verb: Verb;
}

function parseVerbLines(obj: Wob, roomObjects: Wob[], extras: string[], selfRef?: string): ReMatch[] {
	let parsedLines: ReMatch[] = [];
	if (!selfRef)
		selfRef = obj.getProperty(WobProperties.Name);
	obj.getVerbs().forEach((v) => {
		v.signatures.forEach((parsed) => {
			let re = "^(" + parsed.verb + ")";
			if (parsed.dobj) {
				if (Strings.caseEqual(parsed.dobj, "any"))
					re += " " + createTargetsRegex(roomObjects, extras);
				else if (Strings.caseEqual(parsed.dobj, "self"))
					re += " (" + createTargetRegex(selfRef) + ")";
				else if (Strings.caseEqual(parsed.dobj, "none"))
					re += "()";
			}
			if (parsed.prep) {
				let alts = alternates[parsed.prep];
				re += " (" + alts.join("|") + ")";
			}
			if (parsed.indobj) {
				if (Strings.caseEqual(parsed.indobj, "any"))
					re += " " + createTargetsRegex(roomObjects, extras);
				else if (Strings.caseEqual(parsed.indobj, "self"))
					re += " (" + createTargetRegex(selfRef) + ")";
				else if (Strings.caseEqual(parsed.dobj, "none"))
					re += "()";
			}

			parsedLines.push(new ReMatch(re + "$", obj, v));
		});
	});

	return parsedLines;
}

// Looks through the various possibilities and, given a name that may be an @atName or a #nn hash
// name, or a partial name, find the object in question or return null if it can't be found (or is ambiguous).
function findObjectByPartialName(name: string, roomObjs: Wob[], atObjs: Wob[], hashObjs: Wob[]): Wob {
	if (name[0] === "@") {
		let subname = name.substr(1);
		for (let obj of atObjs) {
			if (Strings.caseEqual(obj.getProperty(WobProperties.GlobalId), subname))
				return obj;
		}
		return null;
	} else if (name[0] === "#") {
		let subId = parseInt(name.substr(1), 10);
		for (let obj of hashObjs) {
			if (obj.id === subId)
				return obj;
		}
		return null;
	} else {
		let possibles: Wob[] = [];
		name = name.toLowerCase();
		for (let obj of roomObjs) {
			if (obj.getProperty(WobProperties.Name).toLowerCase().startsWith(name))
				possibles.push(obj);
		}

		if (possibles.length !== 1)
			return null;
		else
			return possibles[0];
	}
}

export class ParseResult {
	constructor(verbName: string, verbObject: Wob, verb: Verb) {
		this.verbName = verbName;
		this.verbObject = verbObject;
		this.verb = verb;
	}

	public verbName: string;
	public verbObject: Wob;
	public verb: Verb;

	public direct: Wob;
	public prep: string;
	public indirect: Wob;
	public prep2: string;
	public indirect2: Wob;
}

export async function parseInput(text: string, self: Wob, world: World): Promise<ParseResult> {
	// Get the container for the player wob.
	let roomWob = await world.getWob(self.container);

	// And get the things inside that room.
	let roomContents = await world.getWobs(roomWob.contents);

	// Look at the text for things with # or @ at their beginning. These may be global
	// references. We'll pull those also.
	let miscWobsAt: Wob[] = [], miscWobsHash: Wob[] = [];
	let tokens = text.split(/\s+/);
	tokens = tokens.filter((t) => t.startsWith("@") || t.startsWith("#"));
	if (tokens.length > 0) {
		let miscHashIds: number[] = [];
		let miscAtIds: string[] = [];
		for (let token of tokens) {
			if (token[0] === "#")
				miscHashIds.push(parseInt(token.substr(1), 10));
			if (token[0] === "@")
				miscAtIds.push(token.substr(1));
		}

		miscWobsAt.push(...(await world.getWobsByGlobalId(miscAtIds)));
		miscWobsHash.push(...(await world.getWobs(miscHashIds)));
	}

	let verbLines: ReMatch[] = [];
	let extras: string[] = [];
	miscWobsAt.forEach(w => { extras.push("@" + w.getProperty(WobProperties.GlobalId)); });
	miscWobsHash.forEach(w => { extras.push("#" + w.id); });
	roomContents.forEach((w) => {
		verbLines.push(...parseVerbLines(w, roomContents, extras));
	});
	miscWobsAt.forEach((w) => {
		verbLines.push(...parseVerbLines(w, roomContents, extras, "@" + w.getProperty(WobProperties.GlobalId)));
	});
	miscWobsHash.forEach((w) => {
		verbLines.push(...parseVerbLines(w, roomContents, extras, "#" + w.id));
	});

	let matches: any[] = [];
	for (let i=0; i<verbLines.length; ++i) {
		let regex = new RegExp(verbLines[i].re, "gi");
		let match = regex.exec(text);
		if (match !== null)
			matches.push({ re:verbLines[i], match:match });
	}

	// At this point we should have an array of regex matches. If we got none, then we don't
	// understand the command. If we got more than one, it was ambiguous.
	if (matches.length === 0) {
		console.log("Don't understand.");
		return;
	}
	if (matches.length > 1) {
		console.log("Ambiguous.");
		return;
	}

	// Let's focus on the one we did get. The first array element will be the full input, but
	// the ones after that will be the individual pieces, starting with the verb and moving on to
	// any other components that were present.
	let pieces = matches[0].match.slice(1);
	let matchedWob = matches[0].re.wob;
	let matchedVerb = matches[0].re.verb;
	let result = new ParseResult(pieces[0], matchedWob, matchedVerb);
	if (pieces[1])
		result.direct = findObjectByPartialName(pieces[1], roomContents, miscWobsAt, miscWobsHash);
	if (pieces[2])
		result.prep = pieces[2];
	if (pieces[3])
		result.indirect = findObjectByPartialName(pieces[3], roomContents, miscWobsAt, miscWobsHash);
	if (pieces[4])
		result.prep2 = pieces[4];
	if (pieces[5])
		result.indirect2 = findObjectByPartialName(pieces[5], roomContents, miscWobsAt, miscWobsHash);

	return result;
}
