/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { Step, Runtime } from "./Runtime";
import { RuntimeException } from "./Exceptions";
import { compile } from "./Parser";
import { LValue } from "./LValue";

export class AstUpdate extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.operator = parseTree.operator;
		this.arg = compile(parseTree.argument);
		this.prefix = parseTree.prefix;
	}

	public execute(runtime: Runtime): void {
		runtime.pushAction(Step.Callback("Update callback", () => {
			let lval: LValue = runtime.popOperand();
			if (!LValue.IsLValue(lval)) {
				throw new RuntimeException("Attempt to use update on non-lvalue", lval);
			}

			let oldValue = LValue.Deref(runtime, lval);
			let newValue;
			switch (this.operator) {
				case "--":
					newValue = oldValue - 1;
					break;
				case "++":
					newValue = oldValue + 1;
					break;
			}

			lval.write(runtime, newValue);
			if (this.prefix)
				runtime.pushOperand(newValue);
			else
				runtime.pushOperand(oldValue);
		}));
		runtime.pushAction(new Step(this.arg, "Update l-value"));
	}

	public what: string = "Update";
	public operator: string;
	public arg: AstNode;
	public prefix: boolean;
}
