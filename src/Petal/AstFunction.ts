/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstStatements } from "./AstStatements";
import { compile } from "./Parser";
import { Runtime } from "./Runtime";
import { IScope } from "./IScope";
import { StandardScope } from "./Scopes/StandardScope";

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
		this.body = new AstStatements(parseTree.body, true);
	}

	public static IsFunction(value: any): boolean {
		if (value === null || value === undefined)
			return false;
		return value.what === "Function" || value.what === "FunctionInstance";
	}

	// We basically just "execute" like an R-Value, to be set in variables or called directly.
	public execute(runtime: Runtime): void {
		// Make an instance with an inner scope linked to the current outer scope.
		let instance: AstFunctionInstance = new AstFunctionInstance(this, runtime.currentScope());

		// Set a variable with our name if requested.
		let curScope = runtime.currentScope();
		if (this.name)
			curScope.set(this.name, instance);

		// And push our value on the operand stack.
		runtime.pushOperand(instance);
	}

	public what: string = "Function";
	public name: string;
	public params: string[];
	public body: AstStatements;
}
