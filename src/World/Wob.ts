/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { WobOperationException, InvalidCodeException } from "./Exceptions";
import { Property } from "./Property";
import { Verb, VerbCode } from "./Verb";
import { CaseMap } from "../Utils/Strings";
import * as Persistence from "../Utils/Persistence";
import { World } from "./World";
import * as Petal from "../Petal/All";
import { Utils } from "./Utils";
import { Perms, Security } from "./Security";
import * as Execution from "./Execution";

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
	public static Image = "image";				// blob

	// On objects with callbacks/timers.
	public static LastOnLoadError = "_lastonloaderror";	// string[]
	public static LastTimerError = "_lasttimererror";	// string[]

	// On player objects.
	public static EventStream = "eventstream";	// [{ type, time, body, tag? }]
	public static PasswordHash = "pwhash";		// string
	public static LastActive = "lastactive";	// int (unix timestamp)
	public static Admin = "admin";				// boolean
}

// This should be kept in sync with the API models.
export class EventType {
	public static Output = "output";				// General output
	public static Command = "command";				// Command echoes
	public static Error = "error";					// Unclassified error
	public static ParseError = "parse_error";		// Error parsing user input
	public static ScriptError = "script_error";		// Error from a Petal script
	public static Debug = "debug";					// Debug messages
	public static MoveNotification = "move_notification";	// Notify when an object (including the player) moves
															// object id, from, and to are passed as notations.
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
		this._properties = new CaseMap<Property>();
		this._verbs = new CaseMap<Verb>();

		this._owner = 1;
		this._group = undefined;
		this._perms = Security.GetDefaultWobPerms();

		this._dirty = true;
		this.updateLastUse();
	}

	// These are just constants that can be passed around for functions that are
	// expected to return a Wob but can't find an appropriate one.
	public static None: Wob = new Wob(-1);
	public static Ambiguous: Wob = new Wob(-2);

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

	public get owner(): number {
		return this._owner;
	}

	public set owner(o: number) {
		this._owner = o;

		// We also have to go through and set the security context on all our verbs.
		for (let v of this.getVerbs())
			v.address.module.securityContext = o;
	}

	public get group(): number {
		return this._group;
	}

	public set group(g: number) {
		this._group = g;
	}

	public get perms(): number {
		return this._perms;
	}

	public set perms(p: number) {
		this._perms = p;
	}

	// If the current wob is an instance of the other wob (i.e. if "other" is somewhere
	// in our base inheritance chain), then this returns true.
	public async instanceOf(otherId: number, world: World): Promise<boolean> {
		// Go up the inheritance chain.
		let uswob: Wob = this;
		let base = uswob.base;
		while (base !== 0 && base !== otherId) {
			uswob = await world.getWob(base);
			base = uswob.base;
		}

		// Did we find a match?
		return base !== 0;
	}

	// Returns the full inheritance chain of the current wob, starting with the current wob itself.
	public async getInheritanceChain(world: World): Promise<Wob[]> {
		let chain: Wob[] = [];

		let uswob: Wob = this;
		while (uswob) {
			chain.push(uswob);
			uswob = await world.getWob(uswob.base);
		}

		return chain;
	}

	// Returns the names of all the properties on this wob.
	public getPropertyNames(): string[] {
		this.updateLastUse();
		return [...this._properties.keys()];
	}

	// Returns the names of all the properties (computed and otherwise) on this wob, with consideration for the
	// inheritance chain.
	public async getPropertyNamesI(world: World): Promise<WobValue<string>[]> {
		let map = await this.getPropertiesI(world);
		let rv = [];
		for (let pair of map.pairs()) {
			rv.push(new WobValue<string>(pair[1].wob, pair[0]));
		}
		return rv;
	}

	// Returns a map from name to WobValue of all properties on this object, with consideration
	// for the inheritance chain.
	public async getPropertiesI(world: World): Promise<CaseMap<WobValue<Property>>> {
		let map = new CaseMap<WobValue<Property>>();
		await this.mapPropertiesI(world, map);
		return map;
	}

	// Recursively search the inheritance chain for properties, computed and literal.
	private async mapPropertiesI(world: World, map: CaseMap<WobValue<Property>>): Promise<void> {
		this.getPropertyNames().forEach(pn => {
			if (!map.has(pn))
				map.set(pn, new WobValue<Property>(this.id, this.getProperty(pn)));
		});
		this.getVerbNames().forEach(pn => {
			if (pn.startsWith("@") && !map.has(pn.substr(1))) {
				let verb = this.getVerb(pn);
				map.set(pn, new WobValue<Property>(this.id, new Property(verb, verb.perms)));
			}
		});
		if (this.base) {
			let baseWob = await world.getWob(this.base);
			baseWob.mapPropertiesI(world, map);
		}
	}

	// Returns the named property on this particular wob, if it exists; doesn't consider the inheritance chain.
	public getProperty(name: string): Property {
		this.updateLastUse();
		return this._properties.get(name);
	}

	// This version searches up the inheritance chain for answers. It also searches
	// for computed property verbs.
	public async getPropertyI(name: string, world: World): Promise<WobValue<Property>> {
		let ourVerb = this._verbs.get("@" + name);
		if (ourVerb)
			return new WobValue<Property>(this.id, new Property(ourVerb, ourVerb.perms));

		let ours = this._properties.get(name);
		if (ours)
			return new WobValue<Property>(this.id, ours);

		if (this.base) {
			let baseWob = await world.getWob(this.base);
			return await baseWob.getPropertyI(name, world);
		} else
			return null;
	}

	// Sets the named property on this particular wob.
	public setProperty(name: string, value: Property): void {
		this.updateLastUse();
		this._dirty = true;
		this._properties.set(name, value);
	}

	// Sets a new property value, keeping the old permissions, or using new defaults
	// if there was no property value before.
	public setPropertyKeepingPerms(name: string, value: any): void {
		let oldProperty = this.getProperty(name);
		let newProperty = Property.CopyPerms(oldProperty, value);
		this.setProperty(name, newProperty);
	}

	public deleteProperty(name: string): void {
		this.updateLastUse();
		this._dirty = true;
		this._properties.delete(name);
	}


	// Record an event in the wob's event stream. 'type' should be a value
	// from the EventType class.
	public event(type: string, timestamp: number, body: any[], tag?: string): void {
		let prop = this.getProperty(WobProperties.EventStream);
		if (prop === null || prop.value === null)
			prop = new Property(new Petal.PetalArray());
		prop.value.push(Petal.PetalObject.FromObject({ type: type, time: timestamp, body: body, tag: tag }));
		this.setProperty(WobProperties.EventStream, prop);
	}


	public getVerbNames(): string[] {
		this.updateLastUse();
		return [...this._verbs.keys()];
	}

	// This version searches up the inheritance chain for answers.
	public async getVerbNamesI(world: World): Promise<WobValue<string>[]> {
		let allVerbs = await this.getVerbsI(world);
		return allVerbs.map(v => new WobValue<string>(v.wob, v.value.word));
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
			if (!map.has(v.word)) {
				map.set(v.word, new WobValue<Verb>(this.id, v));
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

	public deleteVerb(name: string): void {
		this.updateLastUse();
		this._dirty = true;
		this._verbs.delete(name);
	}

	public setVerbCode(name: string, sigs: string[], text: string): void {
		if (!text) {
			this.setVerb(name, null);
			return;
		}

		// Eat CRLFs.
		if (text.indexOf("\r") >= 0)
			text = text.replace("\r\n", "\n");

		// Parse the code.
		let parsed: any = Petal.parseFromSource(text);

		// Verify that it is, in fact, just an object definition.
		if (!Petal.Check.IsSingleFunctionDef(parsed))
			throw new InvalidCodeException("Verb code is not a single function declaration.", parsed);

		// Execute the code. Note that we want the resulting code to run under this wob's security
		// context, so we pass it here.
		let rt = new Petal.Runtime();
		let runresult = rt.executeCode("#" + this.id + "." + name, parsed, null, this._owner, 10000);

		// Look for the variable that was set in the scope.
		let scope = rt.currentScope;
		let varnames = scope.names();

		// This should be a dictionary of verb name -> verb object, where each verb object
		// contains "sigs" (an array) and "code" (a function object). The code may mutate this scope
		// later, but we split it up for verbs here.
		if (sigs === undefined || sigs === null)
			sigs = [];
		let code: Petal.Address = scope.get(varnames[0]);
		this.setVerb(name, new Verb(name, new VerbCode(sigs, text, code.node, code)));
	}

	// If this wob has an $onload verb, call it. This must not fail because it will interrupt
	// upstream things; so logs must be saved on the wob itself.
	public async callOnLoad(world: World): Promise<void> {
		let verb = this.getVerb("$onload");
		if (!verb)
			return;
		try {
			// TODO: Should probably catch the failure output that happens inside this.
			await Execution.executeFunction(null, null, false, world, verb.address, this);
		} catch (err) {
			this.setProperty(WobProperties.LastOnLoadError,
				new Property(Execution.formatPetalException(null, err), Perms.ownerOnly));
		}
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

	private _dirty: boolean;
	private _lastUse: number;

	private _owner: number;
	private _group: number;
	private _perms: number;
}
