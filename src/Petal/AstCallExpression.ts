/*
	Flowerbox
	Copyright (C) 2016 Kayateia, Dove
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstFunction } from "./AstFunction";
import { parse } from "./Parser";
import { Runtime } from "./Runtime";
import { RuntimeException } from "./Exceptions";
import { IScope } from "./IScope";
import { StandardScope } from "./Scopes/StandardScope";
import { ParameterScope } from "./Scopes/ParameterScope";
import { Value } from "./Value";
import { LValue } from "./LValue";
import { ThisValue } from "./ThisValue";
import { Utils } from "./Utils";
import { Compiler } from "./Compiler";
import { Address } from "./Address";

// This class has sort of grown beyond its original purpose and really ought to be
// split into a couple of classes...
export class AstCallExpression extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);

		// We might not have these if the object was created synthetically.
		if (parseTree.callee && parseTree.arguments) {
			this.callee = parse(parseTree.callee);
			this.arguments = parseTree.arguments.map(parse);
		}
	}

	/*public static Create(callee: AstNode | ThisValue, param: any[]): AstCallExpression {
		let ace = new AstCallExpression({});
		ace.callee = callee;
		ace.literalParams = param;

		return ace;
	}

	// Unwinds the stack past the current function call invocation, for early return.
	public static UnwindCurrent(runtime: Runtime): void {
		runtime.popActionWhile((s: Step) => s.name() !== "Function scope");
		runtime.popAction();
	}

	public static PushPreviousThisValue(runtime: Runtime, value: any): void {
		// runtime.pushAction(Step.Extra("Call this marker", { thisValue: value }));
	}

	public static GetCurrentThis(runtime: Runtime): any {
		let step = runtime.findAction((s: Step) => s.name() === "Call this marker");
		if (!step)
			return null;
		else
			return step.extra().thisValue;
	} */

	public compile(compiler: Compiler): void {
		compiler.emit("Call prelude", this, (runtime: Runtime) => {
			runtime.pushBase();
		});

		(<AstNode>this.callee).compile(compiler);
		this.arguments.forEach(a => a.compile(compiler));

		compiler.emit("Call", this, (runtime: Runtime) => {
			// Deref all of the arguments - no passing l-values past a function boundary.
			for (let i=this.arguments.length-1; i>=0; --i) {
				if (runtime.verbose)
					console.log("DEREF ARG", runtime.getOperand(i), Value.Deref(runtime, runtime.getOperand(i)));
				runtime.setOperand(i, Value.Deref(runtime, runtime.getOperand(i)));
			}

			// The top item on the operand stack should be an address or a native function.
			// If it's a native function, we just pop off the parameters and call it.
			let address: Address = Value.Deref(runtime, runtime.getOperand(this.arguments.length));
			if (runtime.verbose) {
				console.log("DEREF CALLEE", runtime.getOperand(this.arguments.length), address);
				console.log("CALLING", address);
			}
			if (!(address instanceof Address))
				throw new RuntimeException("Address is not an Address", address);

			if (address.func) {
				let args = [];
				for (let i=this.arguments.length-1; i>=0; --i)
					args.push(runtime.getOperand(i));
				let result = address.func(...args);
				runtime.returnValue = result;
			} else {
				// Push our current location on the stack (the return address) and set the new location.
				runtime.callPC(address);
			}
		});
		compiler.emit("Call cleanup", this, (runtime: Runtime) => {
			let returnValue = runtime.returnValue;
			runtime.popBase();
			runtime.pushOperand(returnValue);
		});
	}

	/*public execute(runtime: Runtime): any {
		// This can happen because of Create() above. In that case, we don't want to
		// push whatever we got on the action stack.
		let gotAFunction = this.callee instanceof AstFunctionInstance || !(this.callee instanceof AstNode);
		runtime.pushAction(Step.Callback("Function execution", (v) => {
			let callee;
			if (gotAFunction)
				callee = this.callee;
			else
				callee = runtime.popOperand();

			// This extra step of Deref is so that callback functions can return ThisValues to us.
			// This is a hack. FIXME.
			if (LValue.IsLValue(callee))
				callee = LValue.Deref(runtime, callee);

			let thisValue = null;
			let otherInjects = {};
			if (ThisValue.IsThisValue(callee)) {
				let tv: ThisValue = callee;
				thisValue = tv.thisValue;
				otherInjects = tv.others;
			}
			callee = Value.Deref(runtime, callee);

			let caller = AstCallExpression.GetCurrentThis(runtime);
			AstCallExpression.PushPreviousThisValue(runtime, thisValue);

			let values = [];
			if (this.arguments) {
				for (let i=0; i<this.arguments.length; ++i) {
					values.push(Value.PopAndDeref(runtime));
				}
			} else if (this.literalParams)
				values = this.literalParams;

			if (callee === null || callee === undefined)
				throw new RuntimeException("Can't call null/undefined");

			// Are we looking at a real native function or a Petal function?
			if (typeof(callee) === "function") {
				// If the callback returns a Promise, we will return that and bail early.
				let result = callee(...values);
				if (result instanceof Promise)
					return result;
				else
					runtime.pushOperand(result);
			} else if (typeof(callee) === "object" && AstFunction.IsFunction(callee)) {
				// We need to do two things here. The first one is that we need to get the function's
				// arguments in place, using a function argument scope. Then we need to push the contents
				// of the function onto the action stack.
				var func: AstFunctionInstance = callee;
				runtime.pushAction(Step.Scope("Function scope", func.scope));

				let otherInjectNames: string[] = Utils.GetPropertyNames(otherInjects);

				let paramNames: string[] = ["arguments", "this", "caller",
					...otherInjectNames,
					...func.params];
				let scope: IScope = new ParameterScope(func.scope, paramNames);
				scope.set("arguments", values);
				scope.set("this", thisValue);
				scope.set("caller", caller);
				for (let i of otherInjectNames)
					scope.set(i, otherInjects[i]);
				for (let i=0; i<func.params.length && i<values.length; ++i)
					scope.set(func.params[i], values[i]);

				runtime.pushAction(Step.Scope("Parameter scope", scope));
				runtime.pushAction(new Step(func.body));
			} else {
				// Throw something heavy
				throw new RuntimeException("Can't call uncallable object", callee);
			}
			return null;
		}));
		if (!gotAFunction)
			runtime.pushAction(new Step(<AstNode>this.callee, "Callee Resolution"));
		if (this.arguments)
			this.arguments.forEach((p: AstNode) => {
				runtime.pushAction(new Step(p, "Parameter Resolution"));
			});
	} */

	public what: string = "CallExpression";
	public callee: AstNode | ThisValue;
	public arguments: AstNode[];

	public literalParams: any[];
}
