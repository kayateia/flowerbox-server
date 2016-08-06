/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { WobOperationException, InvalidCodeException } from "./Exceptions";
import { Verb, VerbCode } from "./Verb";
import { CaseMap } from "../Utils/Strings";
import * as Persistence from "../Utils/Persistence";
import { World } from "./World";
import * as Petal from "../Petal/All";
import { Utils } from "./Utils";

// When a wob wants to reference another wob in its properties, one of these should be used.
export class WobRef {
	constructor(id: number) {
		this.id = id;
	}

	public persist(): any {
		return { id: this.id };
	}

	public static Unpersist(obj: any): WobRef {
		return new WobRef(obj.id);
	}

	public id: number;
}
Persistence.registerType(WobRef);

// Some well-defined properties.
export class WobProperties {
	// On all objects.
	public static PathId = "pathid";			// string
	public static GlobalId = "globalid";		// string
	public static Name = "name";				// string
	public static Description = "desc";			// string

	// On player objects.
	public static EventStream = "eventstream";	// [{ type, time, body, tag? }]
	public static PasswordHash = "pwhash";		// string
	public static LastActive = "lastactive";	// int (unix timestamp)
}

// This should be kept in sync with the API models.
export class EventType {
	public static Output = "output";				// General output
	public static Command = "command";				// Command echoes
	public static Error = "error";					// Unclassified error
	public static ParseError = "parse_error";		// Error parsing user input
	public static ScriptError = "script_error";		// Error from a Petal script
}

// Tags a value with what specific wob it came from.
export class WobValue<T> {
	public wob: number;
	public value: T;

	constructor(wob: number, value: T) {
		this.wob = wob;
		this.value = value;
	}
}

export class Wob {
	constructor(id: number) {
		this._id = id;
		this._container = 0;
		this._base = 0;
		this._contents = [];
		this._properties = new CaseMap<any>();
		this._verbs = new CaseMap<Verb>();

		this._dirty = true;
		this.updateLastUse();
	}

	public get id(): number {
		this.updateLastUse();
		return this._id;
	}

	public get container(): number {
		this.updateLastUse();
		return this._container;
	}

	// Only for use by World and Database.
	public set container(id: number) {
		this.updateLastUse();
		this.dirty = true;
		this._container = id;
	}

	// Read-only for everyone but World and Database. This is an in-memory cache of the
	// objects contained by this one. It will be maintained by World whenever an operation happens.
	public get contents(): number[] {
		this.updateLastUse();
		return this._contents;
	}

	// Only for use by World.
	// Note that this doesn't set the dirty flag because this is a computed property.
	public addContent(id: number): void {
		this.updateLastUse();
		this._contents.push(id);
	}

	// Only for use by World.
	// Note that this doesn't set the dirty flag because this is a computed property.
	public removeContent(id: number): void {
		this.updateLastUse();
		this._contents = this._contents.filter(i => i != id);
	}

	public get base(): number {
		this.updateLastUse();
		return this._base;
	}
	public set base(v: number) {
		this.updateLastUse();
		this._dirty = true;
		this._base = v;
	}

	public getPropertyNames(): string[] {
		this.updateLastUse();
		return [...this._properties.keys()];
	}

	// This version searches up the inheritance chain for answers.
	public async getPropertyNamesI(world: World): Promise<WobValue<string>[]> {
		let map = new CaseMap<WobValue<string>>();
		await this.mapPropertyNamesI(world, map);
		return map.values();
	}

	private async mapPropertyNamesI(world: World, map: CaseMap<WobValue<string>>): Promise<void> {
		this.getPropertyNames().forEach(pn => {
			if (!map.has(pn))
				map.set(pn, new WobValue<string>(this.id, pn));
		});
		if (this.base) {
			let baseWob = await world.getWob(this.base);
			baseWob.mapPropertyNamesI(world, map);
		}
	}

	public getProperty(name: string): any {
		this.updateLastUse();
		return this._properties.get(name);
	}

	// This version searches up the inheritance chain for answers.
	public async getPropertyI(name: string, world: World): Promise<WobValue<any>> {
		let ours = this._properties.get(name);
		if (ours)
			return new WobValue<any>(this.id, ours);

		if (this.base) {
			let baseWob = await world.getWob(this.base);
			return await baseWob.getPropertyI(name, world);
		} else
			return null;
	}

	public setProperty(name: string, value: any): void {
		this.updateLastUse();
		this._dirty = true;
		this._properties.set(name, value);
	}

	// Record an event in the wob's event stream. 'type' should be a value
	// from the EventType class.
	public event(type: string, timestamp: number, body: any[], tag?: string): void {
		let value = this.getProperty(WobProperties.EventStream);
		if (value == null)
			value = new Petal.PetalArray();
		value.push(Petal.PetalObject.FromObject({ type: type, time: timestamp, body: body, tag: tag }));
		this.setProperty(WobProperties.EventStream, value);
	}

	public getVerbNames(): string[] {
		this.updateLastUse();
		return [...this._verbs.keys()];
	}

	// This version searches up the inheritance chain for answers.
	public async getVerbNamesI(world: World): Promise<WobValue<string>[]> {
		let allVerbs = await this.getVerbsI(world);
		return allVerbs.map(v => new WobValue<string>(v.wob, v.value.verb));
	}

	// IMPORTANT NOTE: Don't just getVerb() and modify the Verb object. This will
	// not set the dirty and last use flags. Instead, modify the Verb and then call
	// setVerb() with it.
	public getVerb(name: string): Verb {
		this.updateLastUse();
		return this._verbs.get(name);
	}

	// This version searches up the inheritance chain for answers.
	public async getVerbI(name: string, world: World): Promise<WobValue<Verb>> {
		let ours = this._verbs.get(name);
		if (ours)
			return new WobValue<Verb>(this.id, ours);

		if (this.base) {
			let baseWob = await world.getWob(this.base);
			return await baseWob.getVerbI(name, world);
		} else
			return null;
	}

	public getVerbs(): Verb[] {
		this.updateLastUse();
		return [...this._verbs.values()];
	}

	// This version searches up the inheritance chain for answers.
	public async getVerbsI(world: World): Promise<WobValue<Verb>[]> {
		let map = new CaseMap<WobValue<Verb>>();
		await this.mapVerbsI(world, map);
		return map.values();
	}

	private async mapVerbsI(world: World, map: CaseMap<WobValue<Verb>>): Promise<void> {
		this.getVerbs().forEach(v => {
			if (!map.has(v.verb)) {
				map.set(v.verb, new WobValue<Verb>(this.id, v));
			}
		});
		if (this.base) {
			let baseWob = await world.getWob(this.base);
			await baseWob.mapVerbsI(world, map);
		}
	}

	public setVerb(name: string, value: Verb): void {
		this.updateLastUse();
		this._dirty = true;
		this._verbs.set(name, value);
	}


	public get verbCode(): string {
		return this._verbCode;
	}

	public set verbCode(v: string) {
		if (!v) {
			this._verbCode = null;
			this._verbs = new CaseMap<Verb>();
			return;
		}

		// Eat CRLFs.
		if (v.indexOf("\r") >= 0)
			v = v.replace("\r\n", "\n");

		// Parse the code.
		let parsed: any = Petal.parseFromSource(v);

		// Verify that it is, in fact, just an object definition.
		if (!Petal.Check.IsSingleObjectDef(parsed))
			throw new InvalidCodeException("Verb code is not a single variable declaration with an object value.", parsed);

		// Execute the code.
		let rt = new Petal.Runtime();
		let runresult = rt.executeCode(parsed, null, 1000);

		// Look for the variable that was set in the scope.
		let scope = rt.currentScope;
		let varnames = scope.names();

		// This should be a dictionary of verb name -> verb object, where each verb object
		// contains "sigs" (an array) and "code" (a function object). The code may mutate this scope
		// later, but we split it up for verbs here.
		let verbsObj: any = Petal.ObjectWrapper.Unwrap(scope.get(varnames[0]));
		let verbNames = Petal.Utils.GetPropertyNames(verbsObj);
		for (let vn of verbNames) {
			let verbObj = verbsObj[vn];
			let sigs: string[] = verbObj.sigs;
			if (sigs === undefined || sigs === null)
				sigs = [];
			let code: Petal.Address = verbObj.code;
			this.setVerb(vn, new Verb(vn, new VerbCode(sigs, code.node, code)));
		}

		// And set the original data for later.
		this._verbCode = v;
	}


	public getLastUse(): number {
		return this._lastUse;
	}

	public get dirty(): boolean {
		return this._dirty;
	}
	public set dirty(v: boolean) {
		this._dirty = v;
	}

	// Call whenever something is used on this object, so it will be marked to not
	// be evicted from the in-memory cache.
	private updateLastUse(): void {
		this._lastUse = Date.now();
	}

	private _id: number;
	private _container: number;
	private _base: number;
	private _contents: number[];
	private _properties: CaseMap<any>;
	private _verbs: CaseMap<Verb>;

	// The verb code for the whole wob. Individual verbs will be peeled out of this.
	private _verbCode: string;

	private _dirty: boolean;
	private _lastUse: number;

	/*private _owner: number;
	private _group: number;*/
}
