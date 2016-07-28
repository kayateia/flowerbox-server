/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstFor } from "./AstFor";
import { AstForIn } from "./AstForIn";
import { Runtime } from "./Runtime";
import { Compiler } from "./Compiler";
import { CompileException } from "./Exceptions";

export class AstContinue extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
	}

	public compile(compiler: Compiler): void {
		for (let i=0; ; ++i) {
			let stackTop = compiler.getNode(i);

			// AstFor and AstForIn have the same shape.
			if (stackTop.node instanceof AstFor || stackTop.node instanceof AstForIn) {
				compiler.emit("Continue statement", this, (runtime: Runtime) => {
					runtime.gotoPC((<AstFor>stackTop.node).nextLabel);
				});
				break;
			} /*else if (topLoop instanceof AstWhile) {
			}*/ else {
				compiler.emitNode(stackTop);
			}
		}
	}

	public what: string = "Continue";
}
