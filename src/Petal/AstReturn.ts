/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstCallExpression } from "./AstCallExpression";
import { compile } from "./Parser";
import { Step, Runtime } from "./Runtime";
import { LValue } from "./LValue";

export class AstReturn extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		if (parseTree.argument)
			this.arg = compile(parseTree.argument);
	}

	public execute(runtime: Runtime): void {
		runtime.pushAction(Step.Callback("Return unwinder", (s) => {
			let rv = undefined;
			if (this.arg)
				rv = LValue.PopAndDeref(runtime);

			runtime.pushOperand(rv);

			AstCallExpression.UnwindCurrent(runtime);
		}));
		if (this.arg)
			runtime.pushAction(new Step(this.arg));
	}

	public what: string = "Return";
	public arg: AstNode;
}
