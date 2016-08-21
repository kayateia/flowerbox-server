/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { NotationWrapper } from "./Execution/NotationWrapper";
import { DuplicationException } from "./Exceptions";
import * as Petal from "../Petal/All";

export class Utils {
	// This can't do anything super complex, but it can handle JSON-like structures as
	// well as some of our primitives that can make it down into Petal.
	public static Duplicate(obj: any): any {
		if (obj === null || obj === undefined)
			return obj;
		if (obj instanceof Array)
			return obj.map(m => Utils.Duplicate(m));
		if (obj instanceof NotationWrapper)
			return new NotationWrapper(obj.notation);
		if (typeof(obj) === "number" || typeof(obj) === "string" || typeof(obj) === "boolean")
			return obj;
		if (obj instanceof Petal.PetalObject) {
			let newobj: Petal.PetalObject = obj.copy();
			for (let k of newobj.keys)
				newobj.set(k, Utils.Duplicate(newobj.get(k)));
			return newobj;
		}
		if (obj instanceof Petal.PetalArray) {
			let newarr: Petal.PetalArray = obj.copy();
			for (let i=0; i<newarr.length; ++i)
				newarr.set(i, Utils.Duplicate(newarr.get(i)));
			return newarr;
		}

		throw new DuplicationException("Can't duplicate non-Petal object", obj);
	}
}
