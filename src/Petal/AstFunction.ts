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

// This is what's actually pushed on the stack when we execute, to guarantee a unique scope.
export class AstFunctionInstance extends AstNode {
	constructor(orig: AstFunction, parentScope: IScope) {
		super({});
		this.name = orig.name;
		this.params = orig.params;
		this.body = orig.body;
		this.scope = new StandardScope(parentScope);
	}
	public what: string = "FunctionInstance";
	public name: string;
	public params: string[];
	public body: AstStatements;
	public scope: IScope;
}

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

		// Add to the current scope, and capture it for use in the function.
		compiler.emit(new Step("Function call symbol", this, (runtime: Runtime) => {
			let scope = runtime.currentScope;
			if (this.name)
				scope.set(this.name, funcStart);
		}));

		// We don't actually want to execute the function code here, just define it. So
		// we'll start by skipping over the function code.
		let skipOver = compiler.newLabel(this);
		compiler.emit(new Step("Temp", this, () => {}));

		// Now we'll compile the function contents.
		funcStart.pc = compiler.pc;
		this.body.compile(compiler);

		// Compile a "just in case" default return.
		compiler.emit(new Step("Function return", this, (runtime: Runtime) => {
			runtime.popPC();
		}));

		// Now replace the instruction above to properly skip over the function.
		let afterLabel = compiler.newLabel(this);
		compiler.replace(skipOver.pc, new Step("Skip over function body", this, (runtime: Runtime) => {
			console.log(afterLabel);
			runtime.gotoPC(afterLabel);
		}));
	}

	// We basically just "execute" like an R-Value, to be set in variables or called directly.
	/*public execute(runtime: Runtime): void {
		// Make an instance with an inner scope linked to the current outer scope.
		let instance: AstFunctionInstance = new AstFunctionInstance(this, runtime.currentScope());

		// Set a variable with our name if requested.
		let curScope = runtime.currentScope();
		if (this.name)
			curScope.set(this.name, instance);

		// And push our value on the operand stack.
		runtime.pushOperand(instance);
	} */

	public what: string = "Function";
	public name: string;
	public params: string[];
	public body: AstStatements;
}
