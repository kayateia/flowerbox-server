/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstCallExpression } from "./AstCallExpression";
import { parse } from "./Parser";
import { Runtime } from "./Runtime";
import { Value } from "./Value";

export class AstReturn extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		if (parseTree.argument)
			this.argument = parse(parseTree.argument);
	}

	/*public execute(runtime: Runtime): void {
		runtime.pushAction(Step.Callback("Return unwinder", (s) => {
			let rv = undefined;
			if (this.argument)
				rv = Value.PopAndDeref(runtime);

			runtime.pushOperand(rv);

			AstCallExpression.UnwindCurrent(runtime);
		}));
		if (this.argument)
			runtime.pushAction(new Step(this.argument));
	} */

	public what: string = "Return";
	public argument: AstNode;
}
