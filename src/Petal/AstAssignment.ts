/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { parse } from "./Parser";
import { Runtime } from "./Runtime";
import { RuntimeException } from "./Exceptions";
import { LValue } from "./LValue";
import { Value } from "./Value";
import { Compiler } from "./Compiler";

export class AstAssignment extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.operator = parseTree.operator;
		this.left = parse(parseTree.left);
		this.right = parse(parseTree.right);
	}

	public compile(compiler: Compiler): void {
		this.left.compile(compiler);
		this.right.compile(compiler);

		compiler.emit("Assignment '" + this.operator + "'", this, (runtime: Runtime) => {
			let rhs = Value.PopAndDeref(runtime);
			let lhs = Value.GetLValue(runtime.popOperand());

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
		});
	}

	public what: string = "Assignment";
	public operator: string;
	public left: AstNode;
	public right: AstNode;
}
