/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { WobRef } from "./Wob";
import { Notation } from "./Notation";
import { NotationWrapper } from "./Execution";
import { Utils as PetalUtils } from "../Petal/Utils";

/*

This takes a JavaScript JSON-style object and converts it into a persistence
format that can handle more than just raw objects and arrays. It looks like this:

{
	type:"object",
	value: {
		a: { type:"number", value: 10 },
		b: {
			type:"array",
			value: [
				{ type:"WobRef", value: { id: 5 } },
				{ type:"Notation", value: { wob: 3, text: "Foo" } }
			]
		}
	}
}

The persistence object itself *is* JSON, but rather than representing JavaScript
values directly, it describes them in terms of types and persisted values.

*/

let types = [
	NotationWrapper,
	WobRef
];

// Convert a complex object into a JSON persistence output.
export function persist(obj: any): any {
	if (typeof(obj) === "number")
		return { type: "number", value: obj };
	else if (typeof(obj) === "string")
		return { type: "string", value: obj };
	else if (obj === undefined)
		return { type: "undefined" };
	else if (obj === null)
		return { type: "null" };
	else if (typeof(obj) !== "object") {
		console.warn("Can't convert", obj, "into persistence JSON");
		return { type: "null" };
	} else if (obj instanceof Array)
		return { type: "array", value: obj.map(i => persist(i)) };
	else if (obj.constructor.name === "Object") {
		let names = PetalUtils.GetPropertyNames(obj);
		let rv = { type: "object", value: {} };
		for (let n of names)
			rv.value[n] = persist(obj[n]);
		return rv;
	} else {
		// See if we have a special handler for it.
		for (let t of types) {
			if (t.name === obj.constructor.name) {
				return { type: t.name, value: obj.persist() };
			}
		}

		console.warn("Can't convert", obj, "into persistence JSON");
		return { type: "null" };
	}
}

export function unpersist(obj: any) {
	if (!obj.type) {
		console.warn("Can't convert", obj, "from persistence JSON");
	}

	switch (obj.type) {
		case "number":
		case "string":
		case "undefined":
			return obj.value;
		case "null":
			return null;
		case "array":
			return obj.value.map(v => unpersist(v));
		case "object":
			let rv = {};
			let names = PetalUtils.GetPropertyNames(obj.value);
			for (let n of names)
				rv[n] = unpersist(obj.value[n]);
			return rv;
		default:
			// See if we have a special handler for it.
			for (let t of types) {
				if (obj.type === t.name)
					return (<any>t).Unpersist(obj.value);
			}

			console.warn("Can't convert", obj, "from persistence JSON");
			return null;
	}
}
