/*
	Flowerbox
	Copyright (C) 2016 Kayateia, Dove
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { Verb, VerbSig } from "./Verb";
import { Wob, WobProperties } from "./Wob";
import { World } from "./World";
import * as Strings from "../Utils/Strings";
import { Actions } from "./Actions";

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
		repieces.push(createTargetRegex(obj.getProperty(WobProperties.Name).value));
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

async function parseVerbLines(world: World, obj: Wob, roomObjects: Wob[], extras: string[], selfRef?: string): Promise<ReMatch[]> {
	let parsedLines: ReMatch[] = [];
	if (!selfRef)
		selfRef = obj.getProperty(WobProperties.Name).value;
	let allVerbs = await obj.getVerbsI(world);
	allVerbs.forEach((v) => {
		v.value.signatures.forEach((parsed) => {
			let re = "^(" + parsed.verb + ")";

			function addOneObject(obj: string): void {
				if (obj === "*")
					re += " ([ \\w]+)";
				else if (Strings.caseEqual(obj, "any"))
					re += " " + createTargetsRegex(roomObjects, extras);
				else if (Strings.caseEqual(obj, "self"))
					re += " (" + createTargetRegex(selfRef) + ")";
				else if (Strings.caseEqual(obj, "none"))
					re += "()";
			}

			if (parsed.dobj)
				addOneObject(parsed.dobj);
			if (parsed.prep) {
				let alts = alternates[parsed.prep];
				re += " (" + alts.join("|") + ")";
			}
			if (parsed.indobj)
				addOneObject(parsed.indobj);
			if (parsed.prep2) {
				let alts = alternates[parsed.prep2];
				re += " (" + alts.join("|") + ")";
			}
			if (parsed.indobj2)
				addOneObject(parsed.indobj2);

			parsedLines.push(new ReMatch(re + "$", obj, v.value));
		});
	});

	return parsedLines;
}

export enum ParseError {
	// Hunky dory.
	NoError,

	// No verb was available to be executed for the text.
	NoVerb,

	// More than one verb was available to be executed for the text.
	Ambiguous
}

export class ParseResult {
	public static Result(verbName: string, verbObject: Wob, verb: Verb) {
		let r = new ParseResult();
		r.verbName = verbName;
		r.verbObject = verbObject;
		r.verb = verb;
		return r;
	}

	public static Failure(why: ParseError, text: string) {
		let r = new ParseResult();
		r.failure = why;
		r.text = text;
		return r;
	}

	public verbName: string;
	public verbObject: Wob;
	public verb: Verb;

	public direct: Wob;
	public directWords: string;
	public prep: string;
	public indirect: Wob;
	public indirectWords: string;
	public prep2: string;
	public indirect2: Wob;
	public indirect2Words: string;

	public failure: ParseError;

	// The whole line entered by the user.
	public text: string;
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

	verbLines.push(...await parseVerbLines(world, self, roomContents, extras, "me"));
	verbLines.push(...await parseVerbLines(world, roomWob, roomContents, extras, "here"));
	for (let w of roomContents)
		verbLines.push(...await parseVerbLines(world, w, roomContents, extras));
	for (let w of miscWobsAt)
		verbLines.push(...await parseVerbLines(world, w, roomContents, extras, "@" + w.getProperty(WobProperties.GlobalId)));
	for (let w of miscWobsHash)
		verbLines.push(...await parseVerbLines(world, w, roomContents, extras, "#" + w.id));

	let matches: any[] = [];
	for (let i=0; i<verbLines.length; ++i) {
		let regex = new RegExp(verbLines[i].re, "gi");
		let match = regex.exec(text);
		if (match !== null)
			matches.push({ re:verbLines[i], match:match });
	}

	// At this point we should have an array of regex matches. If we got none, then we don't
	// understand the command. If we got more than one, it was ambiguous.
	let failure: ParseError = ParseError.NoError;
	if (matches.length === 0)
		failure = ParseError.NoVerb;

	// The matches are ordered by precedence, so whichever one comes first wins.
	/*if (matches.length > 1)
		failure = ParseError.Ambiguous; */

	let result: ParseResult;
	if (failure != ParseError.NoError) {
		result = ParseResult.Failure(failure, text);
	} else {
		// Let's focus on the one we did get. The first array element will be the full input, but
		// the ones after that will be the individual pieces, starting with the verb and moving on to
		// any other components that were present.
		let pieces = matches[0].match.slice(1);
		let matchedWob = matches[0].re.wob;
		let matchedVerb = matches[0].re.verb;
		result = ParseResult.Result(pieces[0], matchedWob, matchedVerb);
		if (pieces[1]) {
			result.direct = await Actions.Lookup(world, self, pieces[1]);
			result.directWords = pieces[1];
		}
		if (pieces[2])
			result.prep = pieces[2];
		if (pieces[3]) {
			result.indirect = await Actions.Lookup(world, self, pieces[3]);
			result.indirectWords = pieces[3];
		}
		if (pieces[4])
			result.prep2 = pieces[4];
		if (pieces[5]) {
			result.indirect2 = await Actions.Lookup(world, self, pieces[5]);
			result.indirect2Words = pieces[5];
		}
		result.text = text;
	}

	return result;
}
