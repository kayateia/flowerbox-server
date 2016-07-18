/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { Runtime } from "./Runtime";
import { LValue } from "./LValue";
import { Step } from "./Step";
import { Compiler } from "./Compiler";
import { RuntimeException } from "./Exceptions";

export class AstIdentifier extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		if (parseTree.type === "ThisExpression")
			this.name = "this";
		else
			this.name = parseTree.name;
	}

	public compile(compiler: Compiler): void {
		compiler.emit(new Step("Identifier '" + this.name + "' lookup", this, (runtime: Runtime) => {
			let scope = runtime.currentScope();
			if (!scope.has(this.name))
				throw new RuntimeException("Can't look up variable", this.name);

			let value = scope.get(this.name);
			runtime.pushOperand(value);
		}));
	}

	/*public execute(runtime: Runtime): any {
		let scope = runtime.currentScope();

		if (!scope.has(this.name)) {
			// Try the scope catcher.
			let catcher = runtime.scopeCatcher;
			if (catcher) {
				let val = catcher.get(this.name);
				if (val instanceof Promise)
					return val;
				else
					runtime.pushOperand(val);
			} else {
				return runtime.pushOperand(null);
			}
		}

		// We don't actually push the value itself on, but rather a reference to it that
		// may be used as a left-hand (assignable) expression.
		runtime.pushOperand(new LValue(this.name, (rt) => {
			return scope.get(this.name);
		}, (rt, value) => {
			scope.set(this.name, value);
		}));
	} */

	public what: string = "Identifier";
	public name: string;
}
