/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { compile } from "./Parser";
import { Step, Runtime } from "./Runtime";
import { LValue } from "./LValue";

export class AstConditional extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.test = compile(parseTree.test);
		this.result = compile(parseTree.consequent);
		if (parseTree.alternate)
			this.alternate = compile(parseTree.alternate);
		this.statement = parseTree.type === "IfStatement";
	}

	public execute(runtime: Runtime): void {
		runtime.pushAction(Step.Callback("Conditional", () => {
			let result = LValue.PopAndDeref(runtime);

			if (this.statement)
				runtime.pushAction(Step.ClearOperands(runtime));

			if (result)
				runtime.pushAction(new Step(this.result, "Conditional result"));
			else if (this.alternate)
				runtime.pushAction(new Step(this.alternate, "Conditional alternate"));
		}));
		runtime.pushAction(new Step(this.test, "Conditional test"));
	}

	public what: string = "Test";
	public test: AstNode;
	public result: AstNode;
	public alternate: AstNode;
	public statement: boolean;
}
