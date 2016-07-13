/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { Step, Runtime } from "./Runtime";
import { compile } from "./Parser";
import { Value } from "./Value";

export class AstUnaryExpression extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.operator = parseTree.operator;
		this.argument = compile(parseTree.argument);
	}

	public execute(runtime: Runtime): void {
		runtime.pushAction(Step.Callback("Binary comparison", () => {
			let v1 = Value.PopAndDeref(runtime);
			let result = v1;
			switch (this.operator) {
				case "-":
					result = -v1;
					break;
				case "!":
					result = !v1;
					break;
			}

			runtime.pushOperand(result);
		}));
		runtime.pushAction(new Step(this.argument, "UE argument"));
	}

	public what: string = "UnaryExpression";
	public operator: string;
	public argument: AstNode;
}
