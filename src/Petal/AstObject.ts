/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstIdentifier } from "./AstIdentifier";
import { compile } from "./Parser";
import { ParseException } from "./Exceptions";
import { Step, Runtime } from "./Runtime";
import { Value } from "./Value";
import { Utils } from "./Utils";

export class AstObject extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.contents = {};
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

			let value = compile(p.value);

			this.contents[key] = value;
		});
	}

	public static IsPetalObject(object: any): boolean {
		if (object === undefined || object === null)
			return false;
		return object.___petalObject;
	}

	public execute(runtime: Runtime): any {
		runtime.pushAction(Step.Callback("Object constructor", () => {
			// This prevents superclass properties from mixing in.
			let result = new Object(null);
			Utils.GetPropertyNames(this.contents).forEach((p) => {
				let value = Value.PopAndDeref(runtime);
				result[p] = value;
			});
			result["___petalObject"] = true;
			runtime.pushOperand(result);
		}));
		Utils.GetPropertyNames(this.contents).forEach((i) =>
			runtime.pushAction(new Step(this.contents[i], "Object member")));
	}

	public what: string = "ObjectExpression";
	public contents: any;
}
