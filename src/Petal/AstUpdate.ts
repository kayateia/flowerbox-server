/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { Runtime } from "./Runtime";
import { parse } from "./Parser";
import { LValue } from "./LValue";
import { Value } from "./Value";
import { Compiler } from "./Compiler";

export class AstUpdate extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.operator = parseTree.operator;
		this.argument = parse(parseTree.argument);
		this.prefix = parseTree.prefix;
	}

	public compile(compiler: Compiler): void {
		this.argument.compile(compiler);

		compiler.emit("Update l-value", this, (runtime: Runtime) => {
			let lval: LValue = Value.PopAndGetLValue(runtime);

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

			let writeRet = lval.write(runtime, newValue);
			let pushValue;
			if (this.prefix)
				pushValue = newValue;
			else
				pushValue = oldValue;

			if (writeRet instanceof Promise) {
				return writeRet
					.then(() => pushValue);
			} else
				runtime.pushOperand(pushValue);
		});
	}

	public what: string = "Update";
	public operator: string;
	public argument: AstNode;
	public prefix: boolean;
}
