/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { compile } from "./Parser";

export class AstLiteral extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.value = parseTree.value;
	}

	public execute(runtime: any): any {
		runtime.pushOperand(this.value);
	}

	public what: string = "Literal";
	public value: any;
}
