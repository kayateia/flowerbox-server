/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstFor } from "./AstFor";
import { Runtime } from "./Runtime";
import { Loops } from "./Loops";
import { Compiler } from "./Compiler";
import { CompileException } from "./Exceptions";

export class AstContinue extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
	}

	public compile(compiler: Compiler): void {
		let topLoop = compiler.topLoop;
		if (topLoop instanceof AstFor) {
			compiler.emit("Continue statement", this, (runtime: Runtime) => {
				// The continue statement's bp pop is going to be missed when we skip over it, so we'll
				// just do it here. This is probably not a good idea. FIXME
				runtime.popBase();

				runtime.gotoPC((<AstFor>topLoop).nextLabel);
			});
		} /*else if (topLoop instanceof AstWhile) {
		}*/ else {
			throw new CompileException("Can't place a continue statement outside of a loop", this);
		}
	}

	public what: string = "Continue";
}
