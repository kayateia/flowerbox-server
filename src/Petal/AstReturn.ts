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
import { Compiler, NodeStackEntry } from "./Compiler";

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
			let value;
			if (this.argument)
				value = Value.PopAndDeref(runtime);
			else
				value = undefined;
			runtime.returnValue = value;
		});

		// We have to unwind the node stack and emit cleanups as well.
		let endNode;
		for (let i=0; ; ++i) {
			let stackTop = compiler.getNode(i);
			if (stackTop.node instanceof AstFunction) {
				let node = <AstFunction>stackTop.node;
				endNode = node;
				break;
			} else
				compiler.emitNode(stackTop);
		}

		compiler.emit("Return goto", this, (runtime: Runtime) => {
			runtime.gotoPC(endNode.endLabel);
		});
	}

	public what: string = "Return";
	public argument: AstNode;
}
