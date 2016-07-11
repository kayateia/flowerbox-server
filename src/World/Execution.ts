/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { ParseResult, ParseError } from "./InputParser";
import { Wob } from "./Wob";
import { World } from "./World";
import * as Petal from "../Petal/Petal";
import * as Strings from "../Strings";
import { WobOperationException } from "./Exceptions";

// Wraps a Wob for use within Petal.
class WobWrapper implements Petal.IObject {
	constructor(wob: Wob, injections: any) {
		this._wob = wob;
		this._injections = injections;
	}

	public getAccessor(index: any): Petal.LValue {
		if (typeof(index) !== "string")
			throw new WobOperationException("Can't access non-string members on Wobs", []);

		let member: string = index;
		let props: string[] = this._wob.getPropertyNames();
		let verbs: string[] = this._wob.getVerbNames();

		if (Strings.caseIn(member, props)) {
			return new Petal.LValue("Wob." + member, (runtime: Petal.Runtime) => {
				return this._wob.getProperty(member);
			}, (runtime: Petal.Runtime, value: any) => {
				this._wob.setProperty(member, value);
			});
		} else if (Strings.caseIn(member, verbs)) {
			return new Petal.LValue("Wob." + member, (runtime: Petal.Runtime) => {
				return new Petal.ThisValue(this, this._wob.getVerb(member).compiled, this._injections);
			}, (runtime: Petal.Runtime, value: any) => {
				throw new WobOperationException("Can't set new verbs right now", []);
			});
		} else {
		}
	}

	private _wob: Wob;
	private _injections: any;
}

// Represents the $ object within the game, which represents the interface to the game itself.
class DollarObject {
	constructor(world: World, injections: any) {
		this._world = world;
		this._injections = injections;
	}

	public log(): void {
		let args = [];
		for (let i=0; i<arguments.length; ++i)
			args.push(arguments[i]);
		console.log(">>>", ...args);
	}

	public async get(objId: any): Promise<WobWrapper> {
		if (typeof(objId) === "number") {
			let objNum: number = objId;
			let obj = await this._world.getWob(objNum);
			if (obj)
				return new WobWrapper(obj, this._injections);
			else
				return null;
		} else if (typeof(objId) === "string") {
			let objStr: string = objId;
			if (objStr.startsWith("@")) {
				let wobs = await this._world.getWobsByGlobalId([objStr.substr(1)]);
				if (wobs && wobs.length)
					return new WobWrapper(wobs[0], this._injections);
				else
					return null;
			} else if (objStr.startsWith("/")) {
				return null;
			} else {
				return null;
			}
		} else
			return null;
	}

	public static Members: string[] = [
		"log", "get"
	];

	private _world: World;
	private _injections: any;
}

// Wraps the ParseResult object for $parse inside Petal.
class DollarParse {
	constructor(parse: ParseResult, player: Wob, injections: any) {
		this.verbName = parse.verbName;
		this.verbObject = new WobWrapper(parse.verbObject, injections);
		if (parse.direct)
			this.direct = new WobWrapper(parse.direct, injections);
		this.prep = parse.prep;
		if (parse.indirect)
			this.indirect = new WobWrapper(parse.indirect, injections);
		this.prep2 = parse.prep2;
		if (parse.indirect2)
			this.indirect2 = new WobWrapper(parse.indirect2, injections);

		this.player = new WobWrapper(player, injections);

		this.text = parse.text;
	}

	public static Members: string[] = [
		"verbName", "verbObject", "direct", "prep", "indirect", "prep2", "indirect2", "player", "text"
	];

	public verbName: string;
	public verbObject: WobWrapper;
	// public verb: Verb;

	public direct: WobWrapper;
	public prep: string;
	public indirect: WobWrapper;
	public prep2: string;
	public indirect2: WobWrapper;

	public player: WobWrapper;

	public text: string;
}

export async function executeResult(parse: ParseResult, player: Wob, world: World): Promise<void> {
	// Get the environment ready.
	let injections: any = {};
	let dollar = Petal.ObjectWrapper.WrapGeneric(new DollarObject(world, injections), DollarObject.Members, false);
	let dollarParse = Petal.ObjectWrapper.WrapGeneric(new DollarParse(parse, player, injections), DollarParse.Members, false);
	injections.$ = dollar;
	injections.$parse = dollarParse;

	// Check for a global command handler on #1. If it exists, we'll call that first.
	// FIXME: The top level scope really need to be a const scope to avoid monkey-business with $, $env, etc.
	// Same applies below.
	let rt = new Petal.Runtime(false);

	let root = await world.getWob(1);
	let parserVerb = root.getVerb("$command");
	if (parserVerb) {
		let verbThis = new Petal.ThisValue(root, parserVerb.compiled, injections);
		let result: Petal.ExecuteResult = await rt.executeFunctionAsync(verbThis, [], 10000);
		console.log("$command took", result.stepsUsed, "steps");
		if (result.outOfSteps) {
			console.log("ERROR: Ran out of steps while running $command");
			return;
		}
		if (result.returnValue)
			return;

		if (parse.verb) {
			// Reset the runtime.
			rt = new Petal.Runtime(false);
		}
	}

	// We'll only continue here if we actually found a verb.
	if (parse.verb) {
		// Set up a runtime. We'll install our runtime values from above, then call the verb code.
		// The verb code should create a function named after the verb.
		let verbThis = new Petal.ThisValue(new WobWrapper(parse.verbObject, injections), parse.verb.compiled, injections);
		let result: Petal.ExecuteResult = await rt.executeFunctionAsync(verbThis, [], 10000);
		console.log(parse.verbName, "took", result.stepsUsed, "steps");
		if (result.outOfSteps) {
			console.log("ERROR: Ran out of steps while running", parse.verbName);
			return;
		}
	} else {
		switch (parse.failure) {
			case ParseError.NoVerb:
				console.log("Don't understand.");
				break;
			case ParseError.Ambiguous:
				console.log("Ambiguous.");
				break;
		}
	}
}
