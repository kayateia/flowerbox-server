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
import { AstObject } from "./AstObject";
import { Runtime } from "./Runtime";
import { RuntimeException } from "./Exceptions";
import * as Strings from "../Utils/Strings";
import { Address } from "./Address";

// Simple interface for getting an LValue for a given index/name out of the wrapped object.
// This may also return a ThisValue or a Promise.
export interface IObject {
	getAccessor(index: any): any;
}

export class ObjectWrapper {
	public static Wrap(item: any): IObject {
		switch (typeof(item)) {
			case "number":
				return ObjectWrapper.WrapGeneric(item, ["toString"]);
			case "string":
				return ObjectWrapper.WrapGeneric(item, ["charAt", "concat", "includes", "endsWith", "indexOf",
					"lastIndexOf", "repeat", "replace", "slice", "split", "startsWith", "substr", "substring",
					"toLowerCase", "toUpperCase", "trim", "trimLeft", "trimRight", "length"]);
			case "object":
				if (AstObject.IsPetalObject(item))
					return ObjectWrapper.WrapPetalObject(item);
				if (item.getAccessor)
					return item;
				if (item instanceof Array)
					return ObjectWrapper.WrapGeneric(item, ["copyWithin", "fill", "pop", "push", "reverse", "shift",
						"sort", "splice", "unshift", "length",
						"concat", "join", "slice", "toString", "indexOf", "lastIndexOf"], true);

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

	private static Call(obj: any, funcName: string, param: IArguments): any {
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

	public static WrapPetalObject(item: any): IObject {
		return {
			getAccessor: function(name: any): LValue {
				if (typeof(name) !== "string")
					throw new RuntimeException("Can't use non-string index on Petal object", name);

				if (name.substr(0, 3) === "___")
					throw new RuntimeException("Can't access reserved properties on a Petal object", name);

				return new LValue("Petal object", (runtime: Runtime) => {
					return item[name];
				}, (runtime: Runtime, value: any) => {
					item[name] = value;
				},
				item);
			}
		};
	}
}
