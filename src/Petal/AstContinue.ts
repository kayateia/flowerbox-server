/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { Step, Runtime } from "./Runtime";
import { Loops } from "./Loops";

export class AstContinue extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
	}

	public execute(runtime: Runtime): void {
		Loops.UnwindCurrent(runtime, Loops.Iteration);
	}

	public what: string = "Continue";
}
