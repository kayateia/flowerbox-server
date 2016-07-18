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

export class AstArray extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.elements = parseTree.elements.map(parse);
	}

	/*public execute(runtime: Runtime): any {
		runtime.pushAction(Step.Callback("Array constructor", () => {
			let result = this.elements.map(() => Value.PopAndDeref(runtime));
			runtime.pushOperand(result);
		}));
		this.elements.forEach((i) =>
			runtime.pushAction(new Step(i, "Array member")));
	} */

	public what: string = "ArrayExpression";
	public elements: AstNode[];
}
