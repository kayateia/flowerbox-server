/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstIdentifier } from "./AstIdentifier";
import { compile } from "./Parser";
import { Step, Runtime } from "./Runtime";
import { LValue } from "./LValue";

export class AstArray extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.contents = parseTree.elements.map(compile);
	}

	public execute(runtime: Runtime): any {
		runtime.pushAction(Step.Callback("Array constructor", () => {
			let result = this.contents.map(() => LValue.PopAndDeref(runtime));
			runtime.pushOperand(result);
		}));
		this.contents.forEach((i) =>
			runtime.pushAction(new Step(i, "Array member")));
	}

	public what: string = "ArrayExpression";
	public contents: AstNode[];
}
