/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { ParseResult, ParseError } from "./InputParser";
import { Wob, WobProperties, WobValue } from "./Wob";
import { World } from "./World";
import * as Petal from "../Petal/All";
import * as Strings from "../Utils/Strings";
import { WobReferenceException, WobOperationException } from "./Exceptions";
import { Notation } from "./Notation";
import { Utils } from "./Utils";
import * as Persistence from "./Persistence";

// Wraps a notation for passing around in Petal scripts. These are opaque
// objects and you can't do anything with them but pass them around.
export class NotationWrapper implements Petal.IObject {
	constructor(notation: Notation) {
		this.notation = notation;
	}

	public getAccessor(index: any): any {
		return Petal.LValue.MakeReadOnly(null);
	}

	public toString(): string {
		return "[Notation: " + this.notation.text + "]";
	}

	public persist(): any {
		return this.notation.persist();
	}

	public static Unpersist(obj: any): NotationWrapper {
		return new NotationWrapper(Notation.Unpersist(obj));
	}

	public notation: Notation;
}

class WobPropertyTag {
	constructor(ww: WobWrapper, property: string) {
		this.wob = ww;
		this.property = property;
	}

	public wob: WobWrapper;
	public property: string;
}

// Wraps a Wob for use within Petal.
class WobWrapper implements Petal.IObject {
	constructor(wob: Wob, world: World, injections: any) {
		this._wob = wob;
		this._world = world;
		this._injections = injections;
	}

	public getAccessor(index: any): any {
		if (typeof(index) !== "string")
			throw new WobOperationException("Can't access non-string members on Wobs", []);

		if (index === "id") {
			return new Petal.LValue("Wob.id", () => {
				return this._wob.id;
			}, () => {
				throw new WobOperationException("Can't set the id of objects", []);
			}, this);
		}

		if (index === "location") {
			return new Petal.LValue("Wob.location", async () => {
				let wob = await this._world.getWob(this._wob.container);
				return new WobWrapper(wob, this._world, this._injections);
			}, () => {
				throw new WobOperationException("Can't set the location of objects (use $.move)", []);
			}, this);
		}
		if (index === "base") {
			return new Petal.LValue("Wob.base", async () => {
				let wob = await this._world.getWob(this._wob.base);
				return new WobWrapper(wob, this._world, this._injections);
			}, (rt, value: any) => {
				if (value instanceof WobWrapper)
					value = value.wob.id;
				if (typeof(value) !== "number" || value < 1)
					throw new WobReferenceException("Invalid value for base wob ID", value);

				this._wob.base = value;
			}, this);
		}
		if (index === "contents") {
			return new Petal.LValue("Wob.contents", async (runtime: Petal.Runtime) => {
				let contents = await this._world.getWobs(this._wob.contents);
				return new Petal.PetalArray(runtime, contents.map(w => new WobWrapper(w, this._world, this._injections)));
			}, () => {
				throw new WobOperationException("Can't set the contents of objects (use $.move)", []);
			}, this);
		}

		return (async () => {
			let member: string = index;
			let props: string[] = (await this._wob.getPropertyNamesI(this._world)).map(wv => wv.value);
			let verbs: string[] = (await this._wob.getVerbNamesI(this._world)).map(wv => wv.value);

			// Check verbs first, but if it's not there, assume it's a property so that new properties can be written.
			if (Strings.caseIn(member, verbs)) {
				let verb = await this._wob.getVerbI(member, this._world);
				return new Petal.LValue("Wob." + member, (runtime: Petal.Runtime) => {
					let addr = verb.value.address.copy();
					addr.thisValue = this;
					addr.injections = this._injections;
					return addr;
				}, (runtime: Petal.Runtime, value: any) => {
					throw new WobOperationException("Can't set new verbs right now", []);
				}, this);
			} else /*if (Strings.caseIn(member, props))*/ {
				let prop = await this._wob.getPropertyI(member, this._world);
				return new Petal.LValue("Wob." + member, (runtime: Petal.Runtime) => {
					if (prop && prop.wob !== this._wob.id) {
						let rv = Utils.Duplicate(prop.value);
						Petal.ObjectWrapper.SetTag(rv, new WobPropertyTag(this, member));
						return rv;
					} else {
						if (prop) {
							Petal.ObjectWrapper.SetTag(prop.value, new WobPropertyTag(this, member));
							return prop.value;
						} else
							return null;
					}
				}, (runtime: Petal.Runtime, value: any) => {
					Petal.ObjectWrapper.SetTag(value, new WobPropertyTag(this, member));
					this._wob.setProperty(member, value);
				}, this);
			}
		})();
	}

	public changeNotification(item: Petal.IPetalWrapper): void {
		this._wob.setProperty(item.tag.property, item);
	}

	public get wob(): Wob {
		return this._wob;
	}

	private _wob: Wob;
	private _world: World;
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

	public timestamp(): number {
		return Date.now();
	}

	public async get(objId: any): Promise<WobWrapper> {
		if (typeof(objId) === "number") {
			let objNum: number = objId;
			let obj = await this._world.getWob(objNum);
			if (obj)
				return new WobWrapper(obj, this._world, this._injections);
			else
				return null;
		} else if (typeof(objId) === "string") {
			let objStr: string = objId;
			if (objStr.startsWith("@")) {
				let wobs = await this._world.getWobsByGlobalId([objStr.substr(1)]);
				if (wobs && wobs.length)
					return new WobWrapper(wobs[0], this._world, this._injections);
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

	public async move(objOrId: any /*WobWrapper | number*/, intoOrId: any /*WobWrapper | number*/): Promise<void> {
		if (!objOrId || !intoOrId)
			throw new WobReferenceException("Received a null wob in move()", 0);

		if (objOrId instanceof WobWrapper)
			objOrId = objOrId.wob.id;
		if (intoOrId instanceof WobWrapper)
			intoOrId = intoOrId.wob.id;

		if (typeof(objOrId) !== "number" || typeof(intoOrId) !== "number")
			throw new WobReferenceException("Received a non-wob object in move()", 0);

		await this._world.moveWob(objOrId, intoOrId);
	}

	public async contents(objOrId: any /*WobWrapper | number*/): Promise<WobWrapper[]> {
		if (!objOrId)
			throw new WobReferenceException("Received a null wob in contents()", 0);

		let wob;
		if (typeof(objOrId) === "number")
			wob = await this._world.getWob(objOrId);
		if (objOrId instanceof WobWrapper)
			wob = objOrId.wob;

		if (!wob)
			throw new WobReferenceException("Received a non-wob object in contents()", 0);

		let contents = await this._world.getWobs(wob.contents);
		return contents.map(w => new WobWrapper(w, this._world, this._injections));
	}

	public async create(intoOrId: any /*WobWrapper | number*/): Promise<WobWrapper> {
		if (!intoOrId)
			throw new WobReferenceException("Received a null wob in create()", 0);

		if (intoOrId instanceof WobWrapper)
			intoOrId = intoOrId.wob.id;

		if (typeof(intoOrId) !== "number")
			throw new WobReferenceException("Received a non-wob object in create()", 0);

		// Create the new object and default to a generic, baseless object.
		let newWob = await this._world.createWob(intoOrId);
		newWob.base = 1;

		return new WobWrapper(newWob, this._world, this._injections);
	}

	public async notate(text: any, notation: any): Promise<any> {
		// Allow users to pass in only a wob and get a notation.
		if (text instanceof WobWrapper) {
			notation = text;
			text = await notation.wob.getPropertyI(WobProperties.Name, this._world);
			if (text)
				text = text.value;
		}

		if (typeof(text) !== "string") {
			console.log(text);
			// Don't think this is quite the right exception...
			throw new WobReferenceException("Received a non-string for notation", 0);
		}

		// Try to convert objects back out of their Petal wrappers and such, if possible.
		if (notation instanceof WobWrapper)
			notation = notation.wob;

		return new NotationWrapper(new Notation(text, notation));
	}

	public static Members: string[] = [
		"log", "logArray", "timestamp", "get", "move", "contents", "create", "notate"
	];

	private _world: World;
	private _injections: any;
}

// Wraps the ParseResult object for $parse inside Petal.
class DollarParse {
	constructor(parse: ParseResult, player: Wob, world: World, injections: any) {
		this.verbName = parse.verbName;
		this.verbObject = new WobWrapper(parse.verbObject, world, injections);
		if (parse.direct)
			this.direct = new WobWrapper(parse.direct, world, injections);
		this.prep = parse.prep;
		if (parse.indirect)
			this.indirect = new WobWrapper(parse.indirect, world, injections);
		this.prep2 = parse.prep2;
		if (parse.indirect2)
			this.indirect2 = new WobWrapper(parse.indirect2, world, injections);

		this.player = new WobWrapper(player, world, injections);

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
					return new WobWrapper(result, this._world, this._injections);
				});
		} else if (name[0] === "@") {
			let at = name.substr(1);
			return this._world.getWobsByGlobalId([at])
				.then((results) => {
					if (results.length === 0)
						return null;
					else
						return new WobWrapper(results[0], this._world, this._injections);
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

	let dollarParseObj = new DollarParse(parse, player, world, injections);
	let dollarParse = Petal.ObjectWrapper.WrapGeneric(dollarParseObj, DollarParse.Members, false);

	injections.$ = dollar;
	injections.$parse = dollarParse;

	// Check for a global command handler on #1. If it exists, we'll call that first.
	let rootScope = new RootScope(world, injections);
	let changeRouter = (item: Petal.IPetalWrapper) => {
		if (item.tag && item.tag instanceof WobPropertyTag) {
			let ww: WobPropertyTag = item.tag;
			ww.wob.changeNotification(item);
		}
	};
	let rt = new Petal.Runtime(false, rootScope, changeRouter);

	// If it's a literal code line, skip the rest of this.
	let trimmedLine = parse.text.trim();
	if (trimmedLine[0] === ";") {
		let compiled = Petal.parseFromSource(trimmedLine.substr(1));
		let immediateInjections = {
			$: injections.$,
			$parse: injections.$parse,
			caller: dollarParseObj.player,
			this: null
		};
		let result: Petal.ExecuteResult = await rt.executeCodeAsync(compiled, immediateInjections, 100000);
		console.log("Command took", result.stepsUsed, "steps");
		if (result.outOfSteps) {
			console.log("ERROR: Ran out of steps while running immediate command");
			return;
		}
		if (result.returnValue)
			console.log("Command returned:", result.returnValue);
		return;
	}

	let root = await world.getWob(1);
	let parserVerb = root.getVerb("$command");
	if (parserVerb) {
		let addr = parserVerb.address.copy();
		addr.thisValue = new WobWrapper(root, world, injections);
		addr.injections = injections;
		let result: Petal.ExecuteResult = await rt.executeFunctionAsync(addr, [], dollarParseObj.player, 100000);
		console.log("$command took", result.stepsUsed, "steps");
		if (result.outOfSteps) {
			console.log("ERROR: Ran out of steps while running $command");
			return;
		}
		if (result.returnValue)
			return;

		if (parse.verb) {
			// Reset the runtime.
			rt = new Petal.Runtime(false, rootScope, changeRouter);
		}
	}

	// We'll only continue here if we actually found a verb.
	if (parse.verb) {
		// Set up a runtime. We'll install our runtime values from above, then call the verb code.
		let addr = parse.verb.address.copy();
		addr.thisValue = new WobWrapper(parse.verbObject, world, injections);
		addr.injections = injections;
		let result: Petal.ExecuteResult = await rt.executeFunctionAsync(addr, [], dollarParseObj.player, 100000);

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
