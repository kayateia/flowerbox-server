/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { WobOperationException, InvalidCodeException } from "./Exceptions";
import { Verb, VerbCode } from "./Verb";
import { CaseMap } from "../Strings";
import { World } from "./World";
import * as Petal from "../Petal/Petal";

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


	public get verbCode(): string {
		return this._verbCode;
	}

	public set verbCode(v: string) {
		// Eat CRLFs.
		if (v.indexOf("\r") >= 0)
			v = v.replace("\r\n", "\n");

		// Parse the code.
		let parsed: any = Petal.compileFromSource(v);

		// Verify that it is, in fact, just an object definition.
		if (!Petal.Check.IsSingleObjectDef(parsed))
			throw new InvalidCodeException("Verb code is not a single variable declaration with an object value.", parsed);

		// Execute the code.
		let rt = new Petal.Runtime();
		let runresult = rt.executeCode(parsed, 1000);
		console.log("Wob", this.id, "verb code executed in", runresult.stepsUsed, "steps.");

		// Look for the variable that was set in the scope.
		let scope = rt.currentScope();
		let varnames = scope.names();
		if (varnames.length !== 1)
			throw new InvalidCodeException("Verb code did not produce exactly one variable name.", parsed);

		// This should be a dictionary of verb name -> verb object, where each verb object
		// contains "sigs" (an array) and "code" (a function object). The code may mutate this scope
		// later, but we split it up for verbs here.
		let verbsObj: any = scope.get(varnames[0]);
		let verbNames = Petal.Utils.GetPropertyNames(verbsObj);
		for (let vn of verbNames) {
			let verbObj = verbsObj[vn];
			let sigs: string[] = verbObj.sigs;
			if (sigs === undefined || sigs === null)
				sigs = [];
			let code: Petal.AstNode = verbObj.code;
			this.setVerb(vn, new Verb(vn, new VerbCode(sigs, code)));
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
