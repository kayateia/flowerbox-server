/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { Runtime } from "./Runtime";
import { parse } from "./Parser";
import { Value } from "./Value";
import { Compiler } from "./Compiler";

export class AstBinaryExpression extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.operator = parseTree.operator;
		this.left = parse(parseTree.left);
		this.right = parse(parseTree.right);
	}

	public compile(compiler: Compiler): void {
		// This will push the left on the operand stack.
		this.left.compile(compiler);

		let skipRight = compiler.newLabel(this);

		compiler.emit("Check BE left", this, (runtime: Runtime) => {
			let leftValue = Value.PopAndDeref(runtime);
			if (this.operator === "||" && leftValue) {
				runtime.pushOperand(leftValue);
				runtime.gotoPC(skipRight);
				return;
			}
			if (this.operator === "&&" && !leftValue) {
				runtime.pushOperand(false);
				runtime.gotoPC(skipRight);
				return;
			}
			// Put it back for the BE right.
			runtime.pushOperand(leftValue);
		});

		// This will push the right on the operand stack.
		this.right.compile(compiler);

		compiler.emit("Check BE right", this, (runtime: Runtime) => {
			let rightValue = Value.PopAndDeref(runtime);
			let leftValue = runtime.popOperand();
			let result: any;
			switch (this.operator) {
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
		});

		skipRight.pc = compiler.pc;
	}

	public what: string = "BinaryExpression";
	public operator: string;
	public left: AstNode;
	public right: AstNode;
}
