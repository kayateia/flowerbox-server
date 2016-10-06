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
import { CompileException, RuntimeException } from "./Exceptions";
import { Markers } from "./StackItem";

export class AstContinue extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
	}

	public compile(compiler: Compiler): void {
		compiler.emit("Continue statement", this, (runtime: Runtime) => {
			runtime.popWhile(i => i.marker !== Markers.Continue);

			let nextIteration = runtime.get(0).nextIteration;
			runtime.gotoPC(nextIteration);
		});
	}

	public what: string = "Continue";
}
