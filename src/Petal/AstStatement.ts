/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { parse } from "./Parser";
import { Runtime } from "./Runtime";
import { Compiler } from "./Compiler";
import { Value } from "./Value";
import { StackItem, Markers } from "./StackItem";

export class AstStatement extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		if (parseTree.expression)
			this.statement = parse(parseTree.expression);
	}

	public compile(compiler: Compiler): void {
		compiler.emit("Pre-statement stack save", this, (runtime: Runtime) => {
			runtime.pushMarker(Markers.Statement);
		});

		this.statement.compile(compiler);

		compiler.emit("Post-statement stack restore", this, (runtime: Runtime) => {
			runtime.popWhile(i => i.marker !== Markers.Statement);
			runtime.pop();
		});
	}

	public what: string = "Statement";
	public statement: AstNode;
}
