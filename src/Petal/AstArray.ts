/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstIdentifier } from "./AstIdentifier";
import { parse } from "./Parser";
import { Runtime } from "./Runtime";
import { Value } from "./Value";
import { Compiler } from "./Compiler";
import { PetalArray } from "./Objects";

export class AstArray extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.elements = parseTree.elements.map(parse);
	}

	public compile(compiler: Compiler): void {
		this.elements.forEach(i => i.compile(compiler));

		compiler.emit("Array constructor", this, (runtime: Runtime) => {
			let result = this.elements.map(() => Value.PopAndDeref(runtime)).reverse();
			runtime.pushOperand(new PetalArray(result));
		});
	}

	public what: string = "ArrayExpression";
	public elements: AstNode[];
}
