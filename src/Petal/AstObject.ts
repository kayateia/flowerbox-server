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
import { Compiler } from "./Compiler";
import { ObjectWrapper } from "./Objects";

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

	public compile(compiler: Compiler): void {
		Utils.GetPropertyNames(this.properties).reverse().forEach(i =>
			this.properties[i].compile(compiler));

		compiler.emit("Object collection", this, (runtime: Runtime) => {
			// This prevents superclass properties from mixing in.
			let result = ObjectWrapper.NewPetalObject();
			Utils.GetPropertyNames(this.properties).forEach((p) => {
				let value = Value.PopAndDeref(runtime);
				result[p] = value;
			});
			runtime.pushOperand(result);
		});
	}

	public what: string = "ObjectExpression";
	public properties: any;
}
