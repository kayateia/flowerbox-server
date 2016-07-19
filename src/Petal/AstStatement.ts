/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { parse } from "./Parser";
import { Runtime } from "./Runtime";
import { Compiler } from "./Compiler";

export class AstStatement extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		if (parseTree.expression)
			this.statement = parse(parseTree.expression);
	}

	public compile(compiler: Compiler): void {
		compiler.emit("Pre-statement bp save", this, (runtime: Runtime) => {
			runtime.pushBase();
		});

		this.statement.compile(compiler);

		compiler.emit("Post-statement bp restore", this, (runtime: Runtime) => {
			runtime.popBase();
		});
	}

	public what: string = "Statement";
	public statement: AstNode;
}
