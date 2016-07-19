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
import { Compiler } from "./Compiler";

export class AstReturn extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		if (parseTree.argument)
			this.argument = parse(parseTree.argument);
	}

	public compile(compiler: Compiler): void {
		let topFunc = compiler.topFunc;

		if (this.argument)
			this.argument.compile(compiler);

		compiler.emit("Return statement", this, (runtime: Runtime) => {
			if (this.argument)
				runtime.returnValue = Value.PopAndDeref(runtime);
			else
				runtime.returnValue = null;

			// The return statement's bp pop is going to be missed when we skip over it, so we'll
			// just do it here. This is probably not a good idea. FIXME
			runtime.popBase();

			runtime.gotoPC((<AstFunction>topFunc).endLabel);
		});
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
