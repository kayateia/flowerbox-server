/*
	Flowerbox
	Copyright (C) 2016 Kayateia, Dove
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

// We have a couple of different cases here: numbers, strings, Petal objects,
// Petal arrays, JavaScript objects, JavaScript arrays, "native" objects.
// Each one needs special handling depending on what it is, because we can't
// just let leaky accesses through to the underlying JavaScript machine.
//
// In order to simplify the situation, there is a single interface, IObject,
// which can be called to retrieve an LValue from an object.member expression.
// These are produced using the IObject factory, which handles the type switching.
//

import { LValue } from "./LValue";
import { Runtime } from "./Runtime";
import { RuntimeException } from "./Exceptions";
import * as Strings from "../Utils/Strings";
import { Address } from "./Address";
import { Utils } from "./Utils";

// Simple interface for getting an LValue for a given index/name out of the wrapped object.
// This may also return a ThisValue or a Promise.
export interface IObject {
	getAccessor(index: any): any;
}

export interface IPetalWrapper {
	tag: any;
}

// A Petal array; we wrap these to keep better control over them as well as to
// allow for change callbacks.
export class PetalArray implements IObject, IPetalWrapper {
	private _items: any[];
	private _runtime: Runtime;
	public tag: any;

	constructor(runtime: Runtime, init?: any[], tag?: any) {
		if (!init)
			init = [];
		this._items = init;
		this.tag = tag;
		this._runtime = runtime;
	}

	public notify(): void {
		if (this.tag)
			this._runtime.notifyChange(this);
	}

	public get array(): any[] {
		return this._items;
	}

	public push(item: any): void {
		this._items.push(item);
		this.notify();
	}

	public pop(): any {
		this.notify();
		return this._items.pop();
	}

	public get(index: number): any {
		return this._items[index];
	}

	public set(index: number, value: any): void {
		let old = this._items[index];
		if (old && (old instanceof PetalArray || old instanceof PetalObject))
			ObjectWrapper.SetTag(old, null);
		if (value instanceof PetalArray || value instanceof PetalObject)
			ObjectWrapper.SetTag(value, this.tag);
		this._items[index] = value;
		this.notify();
	}

	public get length(): number {
		return this._items.length;
	}

	public indexOf(item: any): number {
		return this._items.indexOf(item);
	}

	public slice(a: number, b?: number): PetalArray {
		return new PetalArray(this._runtime, this._items.slice(a, b));
	}

	public unshift(item: any): void {
		this._items.unshift(item);
		this.notify();
	}

	// Makes a shallow copy of the object.
	public copy(): PetalArray {
		return this.slice(0);
	}

	public getAccessor(name: any): any {
		const names = [
			"push", "pop", "length", "indexOf", "slice", "unshift", "copy"
		];
		if (typeof(name) === "string" && Strings.stringIn(name, names))
			return new LValue("Member access", () => {
				if (typeof(this[name]) === "function") {
					let that = this;
					return Address.Function(function() { return ObjectWrapper.Call(that, name, arguments); });
				}
				else
					return this[name];
			}, () => {
				throw new RuntimeException("Can't write to read-only value");
			},
			this);
		else if (typeof(name) === "number") {
			return new LValue("Array access", (runtime: Runtime): any => {
				return this.get(name);
			}, (runtime: Runtime, value: any): void => {
				this.set(name, value);
			},
			this);
		} else
			return LValue.MakeReadOnly(null, this);
	}
}

// A Petal object; we wrap these to keep better control over them as well as to
// allow for change callbacks.
export class PetalObject implements IObject, IPetalWrapper {
	private _items: Map<string, any>;
	private _runtime: Runtime;
	public tag: any;

	constructor(runtime: Runtime, init?: Map<string, any>, tag?: any) {
		if (!init)
			init = new Map<string, any>();
		this._runtime = runtime;
		this._items = init;
		this.tag = tag;
	}

	public notify(): void {
		if (this.tag)
			this._runtime.notifyChange(this);
	}

	public get(index: string): any {
		return this._items.get(index);
	}

	public set(index: string, value: any): void {
		let old = this._items.get(index);
		if (old && (old instanceof PetalArray || old instanceof PetalObject))
			ObjectWrapper.SetTag(old, null);
		if (value instanceof PetalArray || value instanceof PetalObject)
			ObjectWrapper.SetTag(value, this.tag);
		this._items.set(index, value);
		this.notify();
	}

	public get keys(): string[] {
		return [...this._items.keys()];
	}

	// Makes a shallow copy of the object.
	public copy(): PetalObject {
		let map = new Map<string, any>();
		for (let k of this._items.keys())
			map[k] = this._items.get(k);
		return new PetalObject(this._runtime, map);
	}

	public getAccessor(name: any): any {
		if (typeof(name) !== "string")
			throw new RuntimeException("Can't use non-string index on Petal object", name);

		return new LValue("Petal object", (runtime: Runtime) => {
			return this.get(name);
		}, (runtime: Runtime, value: any) => {
			this.set(name, value);
		},
		this);
	}
}

export class ObjectWrapper {
	// Takes a JavaScript (JSON-style) object and converts it into a Petal structure.
	public static Wrap(obj: any, runtime: Runtime, tag?: any): IPetalWrapper {
		if (obj instanceof Array)
			return new PetalArray(runtime, obj.map(i => ObjectWrapper.Wrap(i, runtime, tag)));
		else if (typeof(obj) === "object") {
			let rvmap = new Map<string, any>();
			for (let k of Utils.GetPropertyNames(obj))
				rvmap.set(k, ObjectWrapper.Wrap(obj[k], runtime, tag));
			return new PetalObject(runtime, rvmap, tag);
		} else
			return obj;
	}

	// Takes a Petal object and unwraps it into a form suitable for use outside of Petal.
	public static Unwrap(obj: any): any {
		if (obj instanceof PetalArray)
			return obj.array.map(i => ObjectWrapper.Unwrap(i));
		else if (obj instanceof PetalObject) {
			let rv = {};
			for (let k of obj.keys)
				rv[k] = ObjectWrapper.Unwrap(obj.get(k));
			return rv;
		} else
			return obj;
	}

	// Recursively sets the tag on Petal objects and arrays.
	public static SetTag(item: any, tag: any): void {
		if (item instanceof PetalArray){
			let arr: PetalArray = item;
			arr.tag = tag;
			arr.array.forEach(i => ObjectWrapper.SetTag(i, tag));
		} else if (item instanceof PetalObject) {
			let obj: PetalObject = item;
			obj.tag = tag;
			obj.keys.forEach(k => ObjectWrapper.SetTag(obj.get(k), tag));
		}
	}

	// Takes an item and turns it into an IObject suitable for use in AstMemberExpression.
	public static WrapForMemberAccess(item: any): IObject {
		switch (typeof(item)) {
			case "number":
				return ObjectWrapper.WrapGeneric(item, ["toString"]);
			case "string":
				return ObjectWrapper.WrapGeneric(item, ["charAt", "concat", "includes", "endsWith", "indexOf",
					"lastIndexOf", "repeat", "replace", "slice", "split", "startsWith", "substr", "substring",
					"toLowerCase", "toUpperCase", "trim", "trimLeft", "trimRight", "length"]);
			case "object":
				if (item.getAccessor)
					return item;

				// What's left are other generic objects. We allow read-only access to these as a convenience.
				// These should always be created using new Object(null).
				if (item.hasOwnProperty)
					throw new RuntimeException("A non-empty native object made it down into the works; this is a bug.", item);

				return {
					getAccessor: function(name: string): LValue {
						return LValue.MakeReadOnly(item[name], item);
					}
				};
			case "function":
				throw new RuntimeException("Cannot access properties on a function", item);
			default:
				// Don't know how to wrap this object for member access.
				throw new RuntimeException("Can't wrap this object for member access", item);
		}
	}

	public static Call(obj: any, funcName: string, param: IArguments | any[]): any {
		let args = [];
		for (let i=0; i<param.length; ++i)
			args.push(param[i]);
		return obj[funcName](...args);
	}

	// Generically wraps a native object, allowing only the whitelisted members to be accessed
	// in a read-only manner. If allowNumeric is true, then numeric "members" can also be accessed
	// in a read-write manner. This is for array support.
	public static WrapGeneric(item: any, names: string[], allowNumeric?: boolean): IObject {
		return {
			getAccessor: function(name: any): LValue {
				if (typeof(name) === "string" && Strings.stringIn(name, names))
					return new LValue("Member access", () => {
						if (typeof(item[name]) === "function")
							return Address.Function(function() { return ObjectWrapper.Call(item, name, arguments); });
						else
							return item[name];
					}, () => {
						throw new RuntimeException("Can't write to read-only value");
					},
					item);
				else if (allowNumeric && typeof(name) === "number") {
					return new LValue("Array access", (runtime: Runtime): any => {
						return item[name];
					}, (runtime: Runtime, value: any): void => {
						item[name] = value;
					},
					item);
				} else
					return LValue.MakeReadOnly(null, item);
			}
		};
	}
}
