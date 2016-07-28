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

export class AstUnaryExpression extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.operator = parseTree.operator;
		this.argument = parse(parseTree.argument);
	}

	public compile(compiler: Compiler): void {
		this.argument.compile(compiler);
		compiler.emit("Unary '" + this.operator + "'", this, (runtime: Runtime) => {
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
		});
	}

	public what: string = "UnaryExpression";
	public operator: string;
	public argument: AstNode;
}
