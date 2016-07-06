/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { WobOperationException } from "./Exceptions";
import { Verb } from "./Verb";
import { CaseMap } from "../Strings";
import { World } from "./World";

// When a wob wants to reference another wob in its properties, one of these should be used.
export class WobRef {
	constructor(id: number) {
	}
}

// Some well-defined properties.
export class WobProperties {
	// On all objects.
	public static PathId = "pathid";			// string
	public static GlobalId = "globalid";		// string
	public static Name = "name";				// string
	public static Description = "desc";			// string

	// On player objects.
	public static OutputLog = "outputlog";		// string[]
	public static PasswordHash = "pwhash";		// string
	public static LastActive = "lastactive";	// int (unix timestamp)
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

	public get base(): number {
		this.updateLastUse();
		return this._base;
	}
	public set base(v: number) {
		this.updateLastUse();
		this._dirty = true;
		this._base = v;
	}

	public get contents(): number[] {
		this.updateLastUse();
		return this._contents;
	}
	public addContent(other: Wob): void {
		this.updateLastUse();
		if (other.container === this._id)
			throw new WobOperationException("Wob is already contained by parent", [other.id, this._id]);

		if (other.container)
			throw new WobOperationException("Wob is already contained by another object", [other.id, other.container, this._id]);

		other._container = this._id;
		this._contents.push(other.id);
	}

	public getPropertyNames(): string[] {
		this.updateLastUse();
		return [...this._properties.keys()];
	}

	// This version searches up the inheritance chain for answers.
	public async getPropertyNamesI(world: World): Promise<string[]> {
		let ourProps = this.getPropertyNames();
		if (this.base) {
			let baseWob = await world.getWob(this.base);
			let baseProps = await baseWob.getPropertyNamesI(world);
			ourProps.push(...baseProps);
		}

		return ourProps;
	}

	public getProperty(name: string): any {
		this.updateLastUse();
		return this._properties.get(name);
	}

	// This version searches up the inheritance chain for answers.
	public async getPropertyI(name: string, world: World): Promise<any> {
		let ours = this._properties.get(name);
		if (ours)
			return ours;

		if (this.base) {
			let baseWob = await world.getWob(this.base);
			return baseWob.getPropertyI(name, world);
		} else
			return null;
	}

	public setProperty(name: string, value: any): void {
		this.updateLastUse();
		this._dirty = true;
		this._properties.set(name, value);
	}

	public getVerbNames(): string[] {
		this.updateLastUse();
		return [...this._verbs.keys()];
	}

	// This version searches up the inheritance chain for answers.
	public async getVerbNamesI(world: World): Promise<string[]> {
		let allVerbs = await this.getVerbsI(world);
		return allVerbs.map(v => v.verb);
	}

	// IMPORTANT NOTE: Don't just getVerb() and modify the Verb object. This will
	// not set the dirty and last use flags. Instead, modify the Verb and then call
	// setVerb() with it.
	public getVerb(name: string): Verb {
		this.updateLastUse();
		return this._verbs.get(name);
	}

	// This version searches up the inheritance chain for answers.
	public async getVerbI(name: string, world: World): Promise<Verb> {
		let ours = this._verbs.get(name);
		if (ours)
			return ours;

		if (this.base) {
			let baseWob = await world.getWob(this.base);
			return baseWob.getVerbI(name, world);
		} else
			return null;
	}

	public getVerbs(): Verb[] {
		this.updateLastUse();
		return [...this._verbs.values()];
	}

	// This version searches up the inheritance chain for answers.
	public async getVerbsI(world: World): Promise<Verb[]> {
		let ourVerbs = this.getVerbs();
		if (this.base) {
			let baseWob = await world.getWob(this.base);
			let baseVerbs = await baseWob.getVerbsI(world);
			ourVerbs.push(...baseVerbs);
		}

		return ourVerbs;
	}

	public setVerb(name: string, value: Verb): void {
		this.updateLastUse();
		this._dirty = true;
		this._verbs.set(name, value);
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

	/*private _owner: number;
	private _group: number;*/
}
