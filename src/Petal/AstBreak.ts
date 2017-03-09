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
import { Markers } from "./StackItem";

export class AstBreak extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
	}

	public compile(compiler: Compiler): void {
		compiler.emit("Break statement", this, (runtime: Runtime) => {
			runtime.popWhile(i => i.marker !== Markers.Break);
			runtime.gotoPC(runtime.get(0).exitLoop);
		});
	}

	public what: string = "Break";
}
