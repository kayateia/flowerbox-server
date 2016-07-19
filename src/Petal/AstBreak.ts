/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstFor } from "./AstFor";
import { AstForIn } from "./AstForIn";
import { Runtime } from "./Runtime";
import { Loops } from "./Loops";
import { Compiler } from "./Compiler";
import { CompileException } from "./Exceptions";

export class AstBreak extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
	}

	public compile(compiler: Compiler): void {
		let topLoop = compiler.topLoop;

		// AstFor and AstForIn have the same shape.
		if (topLoop instanceof AstFor || topLoop instanceof AstForIn) {
			compiler.emit("Break statement", this, (runtime: Runtime) => {
				// The break statement's bp pop is going to be missed when we skip over it, so we'll
				// just do it here. This is probably not a good idea. FIXME
				runtime.popBase();

				runtime.gotoPC((<AstFor>topLoop).postLoopLabel);
			});
		} /*else if (topLoop instanceof AstWhile) {
		}*/ else {
			throw new CompileException("Can't place a break statement outside of a loop", this);
		}
	}

	public what: string = "Break";
}
