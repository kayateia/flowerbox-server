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
import { IObject } from "./Objects";

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
			let leftValue = Value.PopAndDeref(runtime);
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
					result = AstBinaryExpression.CheckEquality(leftValue, rightValue, runtime);
					break;
				case "!=":
				case "!==":
					result = !AstBinaryExpression.CheckEquality(leftValue, rightValue, runtime);
					break;
				case "instanceof":
					result = AstBinaryExpression.CheckInstanceOf(leftValue, rightValue, runtime);
					break;
				case "||":
					result = leftValue || rightValue;
					break;
				case "&&":
					result = leftValue && rightValue;
					break;
			}

			// This lets the Check* functions return a Promise if needed.
			if (result instanceof Promise)
				return result;
			else
				runtime.pushOperand(result);
		});

		skipRight.pc = compiler.pc;
	}

	// Attempts to massage the left and right values to get a custom equality check if possible,
	// otherwise just uses JavaScript's equality check.
	static CheckEquality(left: IObject, right: IObject, runtime: Runtime): boolean {
		if (left === undefined || left === null || right === undefined || right === null)
			return left === right;
		else if (left.equalTo)
			return left.equalTo(right, runtime.accessorCargo);
		else if (right.equalTo)
			return right.equalTo(left, runtime.accessorCargo);
		else
			return left === right;
	}

	// Attempts to massage the left and right values to get a custom instanceof check if possible.
	// Otherwise we just return false - returning JavaScript's values isn't safe because
	// it's explicitly expecting a function, which we can't give here.
	static CheckInstanceOf(left: any, right: any, runtime: Runtime): boolean {
		if (left === undefined || left === null)
			return false;
		else if (left.instanceOf)
			return left.instanceOf(right, runtime.accessorCargo);
		else
			return false;
	}

	public what: string = "BinaryExpression";
	public operator: string;
	public left: AstNode;
	public right: AstNode;
}
