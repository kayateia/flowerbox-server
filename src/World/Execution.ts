/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { ParseResult, ParseError } from "./InputParser";
import { Wob, WobProperties, WobValue, WobRef, EventType } from "./Wob";
import { World } from "./World";
import * as Petal from "../Petal/All";
import * as Strings from "../Utils/Strings";
import { WobReferenceException, WobOperationException } from "./Exceptions";
import { Notation } from "./Notation";
import { Utils } from "./Utils";
import * as Persistence from "../Utils/Persistence";
import { Property, PropertyRef } from "./Property";
import { Perms } from "./Security";

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
Persistence.registerType(NotationWrapper);

class WobPropertyTag {
	constructor(ww: WobWrapper, property: string) {
		this.wob = ww;
		this.property = property;
	}

	public wob: WobWrapper;
	public property: string;
}

// This is passed along to WobWrapper accesses.
class AccessorCargo {
	public world: World;
	public injections: any;

	constructor(world: World, injections: any) {
		this.world = world;
		this.injections = injections;
	}
}

// Wraps a Wob for use within Petal.
export class WobWrapper implements Petal.IObject {
	constructor(id: number) {
		this._id = id;
	}

	public equalTo(other: any, cargo: AccessorCargo): any {
		if (other instanceof WobWrapper)
			return this._id === other._id;
		else
			return false;
	}

	public async instanceOf(other: any, cargo: AccessorCargo): Promise<boolean> {
		let us = this._id;
		let them = other;
		if (them instanceof WobWrapper)
			them = them._id;

		// Load our wob.
		let uswob = await cargo.world.getWob(us);

		// Go up the inheritance chain.
		let base = uswob.base;
		while (base !== 0 && base !== them) {
			uswob = await cargo.world.getWob(base);
			base = uswob.base;
		}

		// Did we find a match?
		return base !== 0;
	}

	public getAccessor(index: any, cargo: AccessorCargo): any {
		if (typeof(index) !== "string")
			throw new WobOperationException("Can't access non-string members on Wobs", []);

		if (index === "id") {
			return new Petal.LValue("Wob.id", () => {
				return this._id;
			}, () => {
				throw new WobOperationException("Can't set the id of objects", []);
			}, this);
		}

		if (index === "location") {
			return new Petal.LValue("Wob.location", async () => {
				let wob = await cargo.world.getWob(this._id);
				return new WobWrapper(wob.container);
			}, () => {
				throw new WobOperationException("Can't set the location of objects (use $.move)", []);
			}, this);
		}
		if (index === "base") {
			return new Petal.LValue("Wob.base", async () => {
				let wob = await cargo.world.getWob(this._id);
				return new WobWrapper(wob.base);
			}, async (rt, value: any) => {
				if (value instanceof WobWrapper)
					value = value.id;
				if (typeof(value) !== "number" || value < 1)
					throw new WobReferenceException("Invalid value for base wob ID", value);

				let wob = await cargo.world.getWob(this._id);
				wob.base = value;
			}, this);
		}
		if (index === "contents") {
			return new Petal.LValue("Wob.contents", async (runtime: Petal.Runtime) => {
				let wob = await cargo.world.getWob(this._id);
				return new Petal.PetalArray(wob.contents.map(w => new WobWrapper(w)));
			}, () => {
				throw new WobOperationException("Can't set the contents of objects (use $.move)", []);
			}, this);
		}

		if (index === "$event") {
			return new Petal.LValue("Wob.$event", async(runtime: Petal.Runtime) => {
				let wob = await cargo.world.getWob(this._id);
				return Petal.Address.Function((type: string, timestamp: number, body: any[]) => {
					wob.event(type, timestamp, body);
				});
			}, () => {
				throw new WobOperationException("Can't set $event on a wob", []);
			}, this);
		}

		return (async () => {
			let wob = await cargo.world.getWob(this._id);
			let member: string = index;
			let props: string[] = (await wob.getPropertyNamesI(cargo.world)).map(wv => wv.value);
			let verbs: string[] = (await wob.getVerbNamesI(cargo.world)).map(wv => wv.value);

			// Check verbs first, but if it's not there, assume it's a property so that new properties can be written.
			if (Strings.caseIn(member, verbs)) {
				let verb = await wob.getVerbI(member, cargo.world);
				return new Petal.LValue("Wob." + member, (runtime: Petal.Runtime) => {
					let addr = verb.value.address.copy();
					addr.thisValue = this;
					addr.injections = cargo.injections;
					return addr;
				}, (runtime: Petal.Runtime, value: any) => {
					throw new WobOperationException("Can't set new verbs right now", []);
				}, this);
			} else /*if (Strings.caseIn(member, props))*/ {
				let prop = await wob.getPropertyI(member, cargo.world);
				return new Petal.LValue("Wob." + member, (runtime: Petal.Runtime) => {
					if (prop && prop.wob !== this._id) {
						let rv = Utils.Duplicate(prop.value.value);
						Petal.ObjectWrapper.SetTag(rv, new WobPropertyTag(this, member));
						return rv;
					} else {
						if (prop) {
							Petal.ObjectWrapper.SetTag(prop.value.value, new WobPropertyTag(this, member));
							return prop.value.value;
						} else
							return null;
					}
				}, (runtime: Petal.Runtime, value: any) => {
					Petal.ObjectWrapper.SetTag(value, new WobPropertyTag(this, member));
					wob.setPropertyKeepingPerms(member, value);
				}, this);
			}
		})();
	}

	public changeNotification(item: Petal.IPetalWrapper, runtime: Petal.Runtime): void {
		// We just try to pull the cached wob to stay sync. If it's not in cache, then
		// it doesn't matter anyway, it can't be dirty.
		let cargo: AccessorCargo = runtime.accessorCargo;
		let wob = cargo.world.getCachedWob(this._id);
		if (wob) {
			// This may not be necessary, but:
			// a) it sets the dirty flag for us,
			// b) if this came to us through inheritance, it will set the local copy.
			wob.setPropertyKeepingPerms((<WobPropertyTag>item.tag).property, item);
		}
	}

	public persist(): any {
		return { id: this._id };
	}

	public static Unpersist(obj: any): any {
		return new WobWrapper(obj.id);
	}

	public get id(): number {
		return this._id;
	}

	private _id: number;
}
Persistence.registerType(WobWrapper);

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
			return new WobWrapper(objNum);
		} else if (typeof(objId) === "string") {
			let objStr: string = objId;
			if (objStr.startsWith("@")) {
				let wobs = await this._world.getWobsByGlobalId([objStr.substr(1)]);
				if (wobs && wobs.length)
					return new WobWrapper(wobs[0].id);
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
			objOrId = objOrId.id;
		if (intoOrId instanceof WobWrapper)
			intoOrId = intoOrId.id;

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
			wob = await this._world.getWob(objOrId.id);

		if (!wob)
			throw new WobReferenceException("Received a non-wob object in contents()", 0);

		return wob.contents.map(w => new WobWrapper(w));
	}

	public async create(intoOrId: any /*WobWrapper | number*/): Promise<WobWrapper> {
		if (!intoOrId)
			throw new WobReferenceException("Received a null wob in create()", 0);

		if (intoOrId instanceof WobWrapper)
			intoOrId = intoOrId.id;

		if (typeof(intoOrId) !== "number")
			throw new WobReferenceException("Received a non-wob object in create()", 0);

		// Create the new object and default to a generic, baseless object.
		let newWob = await this._world.createWob(intoOrId);
		newWob.base = 1;

		return new WobWrapper(newWob.id);
	}

	public async notate(text: any, notation: any, property?: string): Promise<any> {
		// Allow users to pass in only a wob and get a notation.
		if (text instanceof WobWrapper) {
			notation = text;
			let wob = await this._world.getWob(notation.id);
			text = await wob.getPropertyI(WobProperties.Name, this._world);
			if (text)
				text = text.value.value;
		}

		if (typeof(text) !== "string") {
			// Don't think this is quite the right exception...
			throw new WobReferenceException("Received a non-string for notation", 0);
		}

		// Try to convert objects back out of their Petal wrappers and such, if possible.
		if (notation instanceof WobWrapper)
			notation = new WobRef(notation.id);

		// If they passed a property, too, then turn this into a PropertyRef.
		if (property)
			notation = new PropertyRef(notation.id, property);

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
		if (parse.verbObject)
			this.verbObject = new WobWrapper(parse.verbObject.id);
		if (parse.direct)
			this.direct = new WobWrapper(parse.direct.id);
		this.prep = parse.prep;
		if (parse.indirect)
			this.indirect = new WobWrapper(parse.indirect.id);
		this.prep2 = parse.prep2;
		if (parse.indirect2)
			this.indirect2 = new WobWrapper(parse.indirect2.id);

		this.player = new WobWrapper(player.id);

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

	public async get(name: string): Promise<any> {
		if (!name)
			return null;
		if (name[0] === "#") {
			let num = parseInt(name.substr(1), 10);
			return new WobWrapper(num);
		} else if (name[0] === "@") {
			let at = name.substr(1);
			let results = await this._world.getWobsByGlobalId([at]);

			if (results.length === 0)
				return null;
			else
				return new WobWrapper(results[0].id);
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

function handleFailure(parse: ParseResult, player: Wob): void {
	switch (parse.failure) {
		case ParseError.NoVerb:
			player.event(EventType.ParseError, Date.now(), ["Don't understand."]);
			break;
		case ParseError.Ambiguous:
			player.event(EventType.ParseError, Date.now(), ["Ambiguous."]);
			break;
	}
}

function formatPetalException(player: Wob, err: any) : void {
	let output;
	if (err.petalStack)
		output = [err.cause, " ", JSON.stringify(err.petalStack)];
	else
		output = [err.toString(), err.stack];
	player.event(EventType.ScriptError, Date.now(), output);
}

export async function executeResult(parse: ParseResult, player: Wob, world: World): Promise<void> {
	// Get the environment ready.
	let injections: any = {};
	let cargo = new AccessorCargo(world, injections);

	let dollarObj = new DollarObject(world, injections);
	let dollar = Petal.ObjectWrapper.WrapGeneric(dollarObj, DollarObject.Members, false);

	let dollarParseObj = new DollarParse(parse, player, world, injections);
	let dollarParse = Petal.ObjectWrapper.WrapGeneric(dollarParseObj, DollarParse.Members, false);

	let perms = Petal.ObjectWrapper.WrapGeneric(Perms, [ "r", "w", "x", "s", "group", "others" ]);

	injections.$ = dollar;
	injections.$parse = dollarParse;
	injections.$player = dollarParseObj.player;
	injections.$perms = perms;

	// Check for a global command handler on #1. If it exists, we'll call that first.
	let rootScope = new RootScope(world, injections);
	let changeRouter = (item: Petal.IPetalWrapper, runtime: Petal.Runtime) => {
		if (item.tag && item.tag instanceof WobPropertyTag) {
			let ww: WobPropertyTag = item.tag;
			ww.wob.changeNotification(item, runtime);
		}
	};
	let rt = new Petal.Runtime(false, rootScope, changeRouter, cargo);

	// If it's a literal code line, skip the rest of this.
	let trimmedLine = parse.text.trim();
	if (trimmedLine[0] === ";") {
		let compiled = Petal.parseFromSource(trimmedLine.substr(1));
		let immediateInjections = {
			$: injections.$,
			$parse: injections.$parse,
			$player: injections.$player,
			$perms: injections.$perms,
			caller: dollarParseObj.player,
			this: null
		};
		let result: Petal.ExecuteResult;
		try {
			result = await rt.executeCodeAsync("<immediate>", compiled, immediateInjections, 100000);
		} catch (err) {
			formatPetalException(player, err);
		}
		if (result) {
			console.log("Command took", result.stepsUsed, "steps");
			if (result.outOfSteps) {
				player.event(EventType.ScriptError, Date.now(), ["ERROR: Ran out of steps while running immediate command"]);
				return;
			}
			if (result.returnValue) {
				player.event(EventType.Output, Date.now(), ["Command returned: ", result.returnValue]);
			}
		}
		return;
	}

	// Did we actually get any text?
	if (parse.failure) {
		handleFailure(parse, player);
		return;
	}

	let root = await world.getWob(1);
	let parserVerb = root.getVerb("$command");
	if (parserVerb) {
		let addr = parserVerb.address.copy();
		addr.thisValue = new WobWrapper(1);
		addr.injections = injections;
		let result: Petal.ExecuteResult;
		try {
			result = await rt.executeFunctionAsync(addr, [], dollarParseObj.player, 100000);
		} catch (err) {
			formatPetalException(player, err);
		}
		if (result) {
			player.event(EventType.Debug, Date.now(), ["$command took ", result.stepsUsed, " steps"]);
			if (result.outOfSteps) {
				player.event(EventType.ScriptError, Date.now(), ["ERROR: Ran out of steps while running $command"]);
				return;
			}
			if (result.returnValue)
				return;

			if (parse.verb) {
				// Reset the runtime.
				rt = new Petal.Runtime(false, rootScope, changeRouter, cargo);
			}
		}
	}

	// We'll only continue here if we actually found a verb.
	if (parse.verb) {
		// Set up a runtime. We'll install our runtime values from above, then call the verb code.
		let addr = parse.verb.address.copy();
		addr.thisValue = new WobWrapper(parse.verbObject.id);
		addr.injections = injections;
		let result: Petal.ExecuteResult;
		try {
			result = await rt.executeFunctionAsync(addr, [], dollarParseObj.player, 1000000);
		} catch (err) {
			formatPetalException(player, err);
		}

		if (result) {
			player.event(EventType.Debug, Date.now(), [parse.verbName, " took ", result.stepsUsed, " steps"]);
			if (result.outOfSteps) {
				player.event(EventType.ScriptError, Date.now(), ["ERROR: Ran out of steps while running ", parse.verbName]);
				return;
			}
		}
	} else {
		handleFailure(parse, player);
	}
}
