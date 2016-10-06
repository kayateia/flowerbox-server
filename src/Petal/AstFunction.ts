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
import { Address } from "./Address";
import { ParameterScope } from "./Scopes/ParameterScope";
import { Step } from "./Step";
import { LValue } from "./LValue";
import { Utils } from "./Utils";
import { StackItem, Markers } from "./StackItem";

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
		compiler.emit("Function call symbol", this, (runtime: Runtime) => {
			let scope = runtime.currentScope;
			closureScope = scope;
			if (this.name)
				scope.set(this.name, funcStart);

			// Even if it has no name, we push it on the operand stack as a value in case
			// someone was trying to call it or assign it to a variable.
			runtime.pushOperand(funcStart);
		});

		// We don't actually want to execute the function code here, just define it. So
		// we'll start by skipping over the function code.
		let skipOver = compiler.newLabel(this);
		let afterLabel = compiler.newLabel(this);
		compiler.replace(skipOver.pc, new Step("Skip over function body", this, (runtime: Runtime) => {
			runtime.gotoPC(afterLabel);
		}));

		// Now we'll compile the function contents.
		funcStart.pc = compiler.pc;

		// Pull in the parameter values. Our stack will look like this:
		// <call marker> <arg0> <arg1> <arg2> ... <argN-1> <number of args> <callee> <return PC>
		// This is relevant because we want to build up the "arguments" parameter,
		// as well as divining the "this" value.
		compiler.emit("Function parameters and closure", this, (runtime: Runtime) => {
			let callee: Address = runtime.get(1).operand;
			let injections: string[] = Utils.GetPropertyNames(callee.injections);

			let argCount = runtime.get(2).operand;
			let paramScope = new ParameterScope(closureScope,
				[...this.params, "this", "arguments", "caller", ...injections]);
			let args = [];
			for (let i=0; i<argCount; ++i) {
				let val = runtime.get(3 + argCount - (1+i)).operand;
				if (i < this.params.length)
					paramScope.set(this.params[i], val);
				args.push(val);
			}
			paramScope.set("arguments", args);

			for (let i of injections)
				paramScope.set(i, callee.injections[i]);

			paramScope.set("this", callee.thisValue);

			let calleeCaller: Address = runtime.get(0).address;
			if (calleeCaller) {
				paramScope.set("caller", calleeCaller.thisValue);
			} else {
				paramScope.set("caller", null);
			}

			let funcScope = new StandardScope(paramScope);
			runtime.push(new StackItem()
				.setScope(funcScope)
				.setMarker(Markers.Function)
				.setAddress(this.endLabel));
		});

		// And the function body.
		this.body.compile(compiler);

		// Compile a "just in case" default return.
		compiler.emit("Function default return", this, (runtime: Runtime) => {
			runtime.returnValue = undefined;
		});

		this.endLabel = compiler.newLabel(this);

		// Pop off the function marker.
		compiler.emit("Function cleanup", this, (runtime: Runtime) => {
			runtime.popWhile(i => i.marker !== Markers.Function);
			runtime.pop();
			runtime.popPC();
		});

		// Now replace the instruction above to properly skip over the function.
		afterLabel.pc = compiler.pc;
	}

	public what: string = "Function";
	public name: string;
	public params: string[];
	public body: AstStatements;
	public endLabel: Address;
}
