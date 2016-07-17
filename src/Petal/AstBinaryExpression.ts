/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { Step, Runtime } from "./Runtime";
import { parse } from "./Parser";
import { Value } from "./Value";

export class AstBinaryExpression extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.operator = parseTree.operator;
		this.left = parse(parseTree.left);
		this.right = parse(parseTree.right);
	}

	public execute(runtime: Runtime): void {
		let leftValue;

		let that = this;
		function doRightSide() {
			runtime.pushAction(Step.Callback("Binary comparison", () => {
				let rightValue = Value.PopAndDeref(runtime);
				let result: any;
				switch (that.operator) {
					case "-":
						result = leftValue - rightValue;
						break;
					case "+":
						result = leftValue + rightValue;
						break;
					case "/":
						result = leftValue / rightValue;
						break;
					case "%":
						result = leftValue % rightValue;
						break;
					case "*":
						result = leftValue * rightValue;
						break;
					case "<":
						result = leftValue < rightValue;
						break;
					case ">":
						result = leftValue > rightValue;
						break;
					case "<=":
						result = leftValue <= rightValue;
						break;
					case ">=":
						result = leftValue >= rightValue;
						break;
					case "==":
					case "===":
						result = leftValue === rightValue;
						break;
					case "!=":
					case "!==":
						result = leftValue !== rightValue;
						break;
					case "||":
						result = leftValue || rightValue;
						break;
					case "&&":
						result = leftValue && rightValue;
						break;
				}

				runtime.pushOperand(result);
			}));
			runtime.pushAction(new Step(that.right, "BC right"));
		}
		runtime.pushAction(Step.Callback("Get BC left value", () => {
			leftValue = Value.PopAndDeref(runtime);

			// Implement short-circuiting here. If the operator is || and this value
			// is true, we don't need to do anything more. Likewise, if the operator is && and
			// this value is false, we don't need to do anything more.
			if (this.operator === "||" && leftValue) {
				runtime.pushOperand(true);
			} else if (this.operator === "&&" && !leftValue) {
				runtime.pushOperand(false);
			} else {
				doRightSide();
			}
		}));
		runtime.pushAction(new Step(this.left, "BC left"));
	}

	public what: string = "BinaryExpression";
	public operator: string;
	public left: AstNode;
	public right: AstNode;
}
