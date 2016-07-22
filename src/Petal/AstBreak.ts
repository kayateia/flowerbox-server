/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstFor } from "./AstFor";
import { AstForIn } from "./AstForIn";
import { AstSwitch } from "./AstSwitch";
import { Runtime } from "./Runtime";
import { Compiler } from "./Compiler";
import { CompileException } from "./Exceptions";

export class AstBreak extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
	}

	public compile(compiler: Compiler): void {
		for (let i=0; ; ++i) {
			let stackTop = compiler.getNode(i);

			// AstFor and AstForIn have the same shape.
			if (stackTop.node instanceof AstFor || stackTop.node instanceof AstForIn) {
				compiler.emit("Break for statement", this, (runtime: Runtime) => {
					runtime.gotoPC((<AstFor>stackTop.node).postLoopLabel);
				});
				break;
			} else if (stackTop.node instanceof AstSwitch) {
				compiler.emit("Break switch statement", this, (runtime: Runtime) => {
					runtime.gotoPC((<AstSwitch>stackTop.node).switchEnd);
				});
				break;
			} /*else if (stackTop instanceof AstWhile) {
			}*/ else {
				compiler.emitNode(stackTop);
			}
		}
	}

	public what: string = "Break";
}
