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
	constructor(wob: Wob) {
		this._wob = wob;
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
				return () => {
					// Eventually, we'll want to call down into the other verb and pass parameters and such.
				};
			}, (runtime: Petal.Runtime, value: any) => {
				throw new WobOperationException("Can't set new verbs right now", []);
			});
		} else {
		}
	}

	private _wob: Wob;
}

// Represents the $ object within the game, which represents the interface to the game itself.
class DollarObject {
	constructor(world: World) {
		this._world = world;
	}

	public log(): void {
		let args = [];
		for (let i=0; i<arguments.length; ++i)
			args.push(arguments[i]);
		console.log(">>>", ...args);
	}

	public async get(objId: any): Promise<WobWrapper> {
		console.log("Got inside get()");
		if (typeof(objId) === "number") {
			let objNum: number = objId;
			let obj = await this._world.getWob(objNum);
			if (obj)
				return new WobWrapper(obj);
			else
				return null;
		} else if (typeof(objId) === "string") {
			let objStr: string = objId;
			if (objStr.startsWith("@")) {
				let wobs = await this._world.getWobsByGlobalId([objStr.substr(1)]);
				if (wobs && wobs.length)
					return new WobWrapper(wobs[0]);
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
}

// Wraps the ParseResult object for $env inside Petal.
class DollarEnv {
	constructor(parse: ParseResult, caller: Wob) {
		this.verbName = parse.verbName;
		this.verbObject = new WobWrapper(parse.verbObject);
		if (parse.direct)
			this.direct = new WobWrapper(parse.direct);
		this.prep = parse.prep;
		if (parse.indirect)
			this.indirect = new WobWrapper(parse.indirect);
		this.prep2 = parse.prep2;
		if (parse.indirect2)
			this.indirect2 = new WobWrapper(parse.indirect2);

		this.caller = new WobWrapper(caller);

		this.text = parse.text;
	}

	public static Members: string[] = [
		"verbName", "verbObject", "direct", "prep", "indirect", "prep2", "indirect2", "caller", "text"
	];

	public verbName: string;
	public verbObject: WobWrapper;
	// public verb: Verb;

	public direct: WobWrapper;
	public prep: string;
	public indirect: WobWrapper;
	public prep2: string;
	public indirect2: WobWrapper;

	public caller: WobWrapper;

	public text: string;
}

export async function executeResult(parse: ParseResult, player: Wob, world: World): Promise<void> {
	// Get the environment ready.
	let dollar = Petal.ObjectWrapper.WrapGeneric(new DollarObject(world), DollarObject.Members, false);
	let dollarEnv = Petal.ObjectWrapper.WrapGeneric(new DollarEnv(parse, player), DollarEnv.Members, false);

	// Check for a global command handler on #1. If it exists, we'll call that first.
	// FIXME: The top level scope really need to be a const scope to avoid monkey-business with $, $env, etc.
	// Same applies below.
	let rt = new Petal.Runtime(false);
	let scope = rt.currentScope();
	scope.set("$", dollar);
	scope.set("$env", dollarEnv);

	let root = await world.getWob(1);
	let parserVerb = root.getVerb("$command");
	if (parserVerb) {
		let result: Petal.ExecuteResult = await rt.executeFunctionAsync(parserVerb.compiled, "$command", [], 10000);
		console.log("$command took", result.stepsUsed, "steps");
		if (result.outOfSteps) {
			console.log("ERROR: Ran out of steps while running $command");
			return;
		}
		if (result.returnValue)
			return;

		if (parse.verb) {
			// Reset the runtime.
			rt = new Petal.Runtime();
			scope = rt.currentScope();
			scope.set("$", dollar);
			scope.set("$env", dollarEnv);
		}
	}

	// We'll only continue here if we actually found a verb.
	if (parse.verb) {
		// Set up a runtime. We'll install our runtime values from above, then call the verb code.
		// The verb code should create a function named after the verb.
		let result: Petal.ExecuteResult = await rt.executeFunctionAsync(parse.verb.compiled, "verb_" + parse.verbName, [], 10000);
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
