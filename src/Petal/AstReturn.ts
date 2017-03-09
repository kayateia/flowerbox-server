/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstFunction } from "./AstFunction";
import { parse } from "./Parser";
import { Runtime } from "./Runtime";
import { Value } from "./Value";
import { Compiler } from "./Compiler";
import { StackItem, Markers } from "./StackItem";

export class AstReturn extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		if (parseTree.argument)
			this.argument = parse(parseTree.argument);
	}

	public compile(compiler: Compiler): void {
		if (this.argument)
			this.argument.compile(compiler);

		compiler.emit("Return statement", this, (runtime: Runtime) => {
			// Handle the return value, if we have one.
			let value;
			if (this.argument)
				value = Value.PopAndDeref(runtime);
			else
				value = undefined;
			runtime.returnValue = value;

			// Unwind the stack until we find the function marker.
			runtime.popWhile(i => i.marker !== Markers.Function);
			runtime.gotoPC(runtime.get(0).address);
		});
	}

	public what: string = "Return";
	public argument: AstNode;
}
