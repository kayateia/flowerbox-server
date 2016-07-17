/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { parse } from "./Parser";
import { Step, Runtime } from "./Runtime";

export class AstStatement extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		if (parseTree.expression)
			this.statement = parse(parseTree.expression);
	}

	public execute(runtime: Runtime): void {
		if (this.statement)
			runtime.pushAction(new Step(this.statement, "Statement"));
	}

	public what: string = "Statement";
	public statement: AstNode;
}
