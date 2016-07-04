/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { WobOperationException } from "./Exceptions";
import { Verb } from "./Verb";

// When a wob wants to reference another wob in its properties, one of these should be used.
export class WobRef {
	constructor(id: number) {
	}
}

// Some well-defined properties.
export class WobProperties {
	public static PathId = "pathid";
	public static GlobalId = "globalid";
	public static Name = "name";
	public static Description = "desc";
	public static Password = "password";
}

export class Wob {
	constructor(id: number) {
		this._id = id;
		this._container = 0;
		this._base = 0;
		this._contents = [];
		this._properties = new Map<string, any>();
		this._verbs = new Map<string, Verb>();

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

	public getProperty(name: string): any {
		this.updateLastUse();
		return this._properties[name];
	}

	public setProperty(name: string, value: any): void {
		this.updateLastUse();
		this._dirty = true;
		this._properties[name] = value;
	}

	public getVerbNames(): string[] {
		this.updateLastUse();
		return [...this._verbs.keys()];
	}

	// IMPORTANT NOTE: Don't just getVerb() and modify the Verb object. This will
	// not set the dirty and last use flags. Instead, modify the Verb and then call
	// setVerb() with it.
	public getVerb(name: string): Verb {
		this.updateLastUse();
		return this._verbs.get(name);
	}

	public getVerbs(): Verb[] {
		this.updateLastUse();
		return [...this._verbs.values()];
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
	private _properties: Map<string, any>;
	private _verbs: Map<string, Verb>;

	private _dirty: boolean;
	private _lastUse: number;

	/*private _owner: number;
	private _group: number;*/
}
