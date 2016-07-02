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
import { runtimeError, Runtime } from "./Runtime";

//
export interface IObject {
	getAccessor(name: string): LValue;
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
						"sort", "splice", "unshift",
						"concat", "join", "slice", "toString", "indexOf", "lastIndexOf"]);

				// What's left are other generic objects. We allow read-only access to these as a convenience.
				// These should always be created using new Object(null).
				if (item.hasOwnProperty)
					throw runtimeError;

				return {
					getAccessor: function(name: string): LValue {
						return LValue.MakeReadOnly(item[name]);
					}
				};
			case "function":
				throw runtimeError;
			default:
				// Don't know how to wrap this object for member access.
				throw runtimeError;
		}
	}

	// Generically wraps a native object, allowing only the whitelisted members to be accessed
	// in a read-only manner.
	public static WrapGeneric(item: any, names: string[]): IObject {
		return {
			getAccessor: function(name: string): LValue {
				if (name in names)
					return LValue.MakeReadOnly(item[name]);
				else
					return null;
			}
		};
	}

	public static WrapPetalObject(item: any): IObject {
		return {
			getAccessor: function(name: string): LValue {
				if (name.substr(0, 3) === "___")
					throw runtimeError;

				return new LValue("Petal object", (runtime: Runtime) => {
					return item[name];
				}, (runtime: Runtime, value: any) => {
					item[name] = value;
				});
			}
		};
	}
}
