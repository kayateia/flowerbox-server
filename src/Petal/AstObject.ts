/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstIdentifier } from "./AstIdentifier";
import { parse } from "./Parser";
import { ParseException } from "./Exceptions";
import { Runtime } from "./Runtime";
import { Value } from "./Value";
import { Utils } from "./Utils";

export class AstObject extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.properties = {};
		parseTree.properties.forEach((p) => {
			// "get" and "set" are also possible - we aren't handling them yet.
			if (p.kind !== "init")
				throw new ParseException("Object property kind '" + p.kind + "' isn't suppoted yet.", parseTree);

			let key = p.key;
			if (key.type === "Identifier")
				key = key.name;
			else if (key.type === "Literal")
				key = key.value;
			else
				throw new ParseException("Unknown key type '" + key.type + "' for object property name", parseTree);

			let value = parse(p.value);

			this.properties[key] = value;
		});
	}

	public static IsPetalObject(object: any): boolean {
		if (object === undefined || object === null)
			return false;
		return object.___petalObject;
	}

	/*public execute(runtime: Runtime): any {
		runtime.pushAction(Step.Callback("Object constructor", () => {
			// This prevents superclass properties from mixing in.
			let result = new Object(null);
			Utils.GetPropertyNames(this.properties).forEach((p) => {
				let value = Value.PopAndDeref(runtime);
				result[p] = value;
			});
			result["___petalObject"] = true;
			runtime.pushOperand(result);
		}));
		Utils.GetPropertyNames(this.properties).forEach((i) =>
			runtime.pushAction(new Step(this.properties[i], "Object member")));
	} */

	public what: string = "ObjectExpression";
	public properties: any;
}
