/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { compile } from "./Parser";
import { Step, Runtime } from "./Runtime";
import { RuntimeException } from "./Exceptions";
import { LValue } from "./LValue";

export class AstAssignment extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.operator = parseTree.operator;
		this.left = compile(parseTree.left);
		this.right = compile(parseTree.right);
	}

	public execute(runtime: Runtime): void {
		runtime.pushAction(Step.Callback("Assignment", () => {
			let lhs = runtime.popOperand();
			let rhs = LValue.PopAndDeref(runtime);
			if (!LValue.IsLValue(lhs))
				throw new RuntimeException("Attempt to assign to non-lvalue");

			let newlhs;
			switch (this.operator) {
				case "=":
					newlhs = rhs;
					break;
				case "+=":
					newlhs = lhs.read(runtime) + rhs;
					break;
				case "-=":
					newlhs = lhs.read(runtime) - rhs;
					break;
				case "*=":
					newlhs = lhs.read(runtime) * rhs;
					break;
				case "/=":
					if (rhs === 0)
						throw new RuntimeException("Divide by zero");
					newlhs = lhs.read(runtime) / rhs;
					break;
			}

			lhs.write(runtime, newlhs);
			runtime.pushOperand(newlhs);
		}));
		runtime.pushAction(new Step(this.left, "Assignment LHS"));
		runtime.pushAction(new Step(this.right, "Assignment RHS"));
	}

	public what: string = "Assignment";
	public operator: string;
	public left: AstNode;
	public right: AstNode;
}
