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
import { WobReferenceException, WobOperationException } from "./Exceptions";

// Wraps a Wob for use within Petal.
class WobWrapper implements Petal.IObject {
	constructor(wob: Wob, injections: any) {
		this._wob = wob;
		this._injections = injections;
	}

	public getAccessor(index: any): Petal.LValue {
		if (typeof(index) !== "string")
			throw new WobOperationException("Can't access non-string members on Wobs", []);

		if (index === "id") {
			return new Petal.LValue("Wob.id", () => {
				return this._wob.id;
			}, () => {
				throw new WobOperationException("Can't set the id of objects", []);
			});
		}

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

	public get wob(): Wob {
		return this._wob;
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

	public logArray(arr: any[]): void {
		console.log(">>>", ...arr);
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

	public async move(obj: WobWrapper, into: WobWrapper): Promise<void> {
		if (!obj || !into)
			throw new WobReferenceException("Received a null wob in move()", 0);
		if (!(obj instanceof WobWrapper) || !(into instanceof WobWrapper))
			throw new WobReferenceException("Received a non-wob object in move()", 0);

		await this._world.moveWob(obj.wob.id, into.wob.id);
	}

	public async contents(obj: WobWrapper): Promise<WobWrapper[]> {
		if (!obj)
			throw new WobReferenceException("Received a null wob in contents()", 0);
		if (!(obj instanceof WobWrapper))
			throw new WobReferenceException("Received a non-wob object in contents()", 0);

		let contents = await this._world.getWobs(obj.wob.contents);
		return contents.map(w => new WobWrapper(w, this._injections));
	}

	public static Members: string[] = [
		"log", "logArray", "get", "move", "contents"
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

// Simple root scope which implements Flowerbox #n and @at lookups.
class RootScope implements Petal.IScopeCatcher {
	constructor(world: World, injections: any) {
		this._world = world;
		this._injections = injections;
	}

	public get(name: string): any {
		if (!name)
			return null;
		if (name[0] === "#") {
			let num = parseInt(name.substr(1), 10);
			return this._world.getWob(num)
				.then(result => {
					return new WobWrapper(result, this._injections);
				});
		} else if (name[0] === "@") {
			let at = name.substr(1);
			return this._world.getWobsByGlobalId([at])
				.then((results) => {
					if (results.length === 0)
						return null;
					else
						return new WobWrapper(results[0], this._injections);
				});
		} else {
			return null;
		}
	}

	public requiresAsync(name: string): boolean {
		return true;
	}

	private _world: World;
	private _injections: any;
}

export async function executeResult(parse: ParseResult, player: Wob, world: World): Promise<void> {
	// Get the environment ready.
	let injections: any = {};

	let dollarObj = new DollarObject(world, injections);
	let dollar = Petal.ObjectWrapper.WrapGeneric(dollarObj, DollarObject.Members, false);

	let dollarParseObj = new DollarParse(parse, player, injections);
	let dollarParse = Petal.ObjectWrapper.WrapGeneric(dollarParseObj, DollarParse.Members, false);

	injections.$ = dollar;
	injections.$parse = dollarParse;

	// Check for a global command handler on #1. If it exists, we'll call that first.
	// FIXME: The top level scope really need to be a const scope to avoid monkey-business with $, $env, etc.
	// Same applies below.
	let rootScope = new RootScope(world, injections);
	let rt = new Petal.Runtime(false, rootScope);

	let root = await world.getWob(1);
	let parserVerb = root.getVerb("$command");
	if (parserVerb) {
		let verbThis = new Petal.ThisValue(root, parserVerb.compiled, injections);
		rt.pushCallerValue(dollarParseObj.player);
		let result: Petal.ExecuteResult = await rt.executeFunctionAsync(verbThis, [], 100000);
		console.log("$command took", result.stepsUsed, "steps");
		if (result.outOfSteps) {
			console.log("ERROR: Ran out of steps while running $command");
			return;
		}
		if (result.returnValue)
			return;

		if (parse.verb) {
			// Reset the runtime.
			rt = new Petal.Runtime(false, rootScope);
		}
	}

	// We'll only continue here if we actually found a verb.
	if (parse.verb) {
		// Set up a runtime. We'll install our runtime values from above, then call the verb code.
		// The verb code should create a function named after the verb.
		let verbThis = new Petal.ThisValue(new WobWrapper(parse.verbObject, injections), parse.verb.compiled, injections);
		rt.pushCallerValue(dollarParseObj.player);
		let result: Petal.ExecuteResult = await rt.executeFunctionAsync(verbThis, [], 100000);
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
