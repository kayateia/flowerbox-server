/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstStatements } from "./AstStatements";
import { AstReturn } from "./AstReturn";
import { Runtime } from "./Runtime";
import { IScope } from "./IScope";
import { StandardScope } from "./Scopes/StandardScope";
import { Compiler } from "./Compiler";
import { Step } from "./Step";
import { Address } from "./Address";
import { ParameterScope } from "./Scopes/ParameterScope";

export class AstFunction extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		if (parseTree.id)
			this.name = parseTree.id.name;
		this.params = parseTree.params.map((i) => i.name);
		if (parseTree.expression)
			this.body = AstStatements.FromStatement(new AstReturn({ argument: parseTree.body }), false);
		else
			this.body = new AstStatements(parseTree.body, false);
	}

	public static IsFunction(value: any): boolean {
		if (value === null || value === undefined)
			return false;
		return value.what === "Function" || value.what === "FunctionInstance";
	}

	public compile(compiler: Compiler): void {
		let funcStart = compiler.newLabel(this);
		let closureScope;

		// Add to the current scope, and capture it for use in the function.
		compiler.emit(new Step("Function call symbol", this, (runtime: Runtime) => {
			let scope = runtime.currentScope;
			closureScope = scope;
			if (this.name)
				scope.set(this.name, funcStart);

			// Even if it has no name, we push it on the operand stack as a value in case
			// someone was trying to call it or assign it to a variable.
			runtime.pushOperand(funcStart);
		}));

		// We don't actually want to execute the function code here, just define it. So
		// we'll start by skipping over the function code.
		let skipOver = compiler.newLabel(this);
		compiler.emit(new Step("Temp", this, () => {}));

		// Now we'll compile the function contents.
		funcStart.pc = compiler.pc;

		// Pull in the parameter values.
		compiler.emit(new Step("Function parameters and closure", this, (runtime: Runtime) => {
			let paramScope = new ParameterScope(closureScope, this.params);
			for (let i=0; i<this.params.length; ++i) {
				let val = runtime.getOperand(i);
				if (val instanceof Address)
					break;
				paramScope.set(this.params[this.params.length - (1+i)], val);
			}
			runtime.pushScope(paramScope);
		}));

		// And the function body.
		this.body.compile(compiler);

		// Compile a "just in case" default return.
		compiler.emit(new Step("Function return", this, (runtime: Runtime) => {
			runtime.popScope();
			runtime.popPC();
		}));

		// Now replace the instruction above to properly skip over the function.
		let afterLabel = compiler.newLabel(this);
		compiler.replace(skipOver.pc, new Step("Skip over function body", this, (runtime: Runtime) => {
			runtime.gotoPC(afterLabel);
		}));
	}

	public what: string = "Function";
	public name: string;
	public params: string[];
	public body: AstStatements;
}
