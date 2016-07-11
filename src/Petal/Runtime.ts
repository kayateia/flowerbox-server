/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstCallExpression } from "./AstCallExpression";
import { IActionCallback } from "./IActionCallback";
import { IScope } from "./IScope";
import { StandardScope } from "./Scopes/StandardScope";
import { SuspendException, RuntimeException } from "./Exceptions";
import { ThisValue } from "./ThisValue";

export class Step {
	constructor(node: AstNode, name?: string, callback?: IActionCallback, scope?: IScope, extra?: any) {
		this._node = node;
		this._name = name;
		this._callback = callback;
		this._scope = scope;
		this._extra = extra;
	}

	public static ClearOperands(runtime: Runtime): Step {
		return new Step(null, "Clear Operand Stack", (v) => {
			runtime.clearOperand();
		});
	}

	public static Callback(name: string, callback: IActionCallback): Step {
		return new Step(null, name, callback);
	}

	public static Scope(name: string, scope: IScope): Step {
		return new Step(null, name, null, scope);
	}

	public static Node(name: string, node: AstNode): Step {
		return new Step(node, name);
	}

	public static Nonce(name: string): Step {
		return new Step(null, name);
	}

	public static Extra(name: string, extra: any): Step {
		return new Step(null, name, null, null, extra);
	}

	public execute(runtime: Runtime): any {
		// console.log("EXECUTING", this._name, ":", this._node);
		if (this._node && this._callback)
			throw new RuntimeException("Can't have both a node and a callback on one step");
		let result;
		if (this._node)
			result = this._node.execute(runtime);

		if (this._callback)
			result = this._callback(this);

		return result;
	}

	public node(): AstNode {
		return this._node;
	}

	public name(): string {
		return this._name;
	}

	public callback(): IActionCallback {
		return this._callback;
	}

	public scope(): IScope {
		return this._scope;
	}

	public extra(): any {
		return this._extra;
	}

	private _node: AstNode;
	private _name: string;
	private _callback: IActionCallback;
	private _scope: IScope;
	private _extra: any;
}

export class ExecuteResult {
	constructor(outOfSteps: boolean, stepsUsed: number, returnValue: any) {
		this.outOfSteps = outOfSteps;
		this.stepsUsed = stepsUsed;
		this.returnValue = returnValue;
	}

	public outOfSteps: boolean;
	public stepsUsed: number;
	public returnValue: any;
}

export class Runtime {
	constructor(verbose?: boolean) {
		this._pipeline = [];
		this._rootScope = new StandardScope();
		this._operandStack = [];
		this._verbose = verbose;
	}

	public pushAction(step: Step): void {
		if (this._verbose)
			console.log("STEPPUSH", step.name(), ":", step.node(), ":", step.scope());
		this._pipeline.push(step);
	}

	public execute(steps: number): ExecuteResult {
		let stepsUsed = 0, stepsTotal = steps;
		let stopEarlyValue = null;
		while (this._pipeline.length && steps--) {
			let step = this._pipeline.pop();
			++stepsUsed;
			if (this._verbose)
				console.log("STEPPOP:", step);
			try {
				stopEarlyValue = step.execute(this);
				if (stopEarlyValue)
					return new ExecuteResult(false, stepsUsed, stopEarlyValue);
			} catch (exc) {
				if (this._verbose)
					console.log("EXCEPTION:", exc);
				throw exc;
			}
		}

		// Did we stop early due to running out of steps?
		if (steps < 0) {
			return new ExecuteResult(true, stepsUsed, null);
		} else {
			// If there was any final return value, return it.
			return new ExecuteResult(false, stepsUsed, this.popOperand());
		}
	}

	public async executeAsync(steps: number): Promise<ExecuteResult> {
		let stepsUsed = 0;
		while (true) {
			// Start out executing code.
			let er = this.execute(steps);
			stepsUsed += er.stepsUsed;

			// Did we run out of total steps? If so, bail.
			if (er.outOfSteps)
				return new ExecuteResult(true, stepsUsed, null);

			// Is the return value a Promise object?
			if (er.returnValue instanceof Promise) {
				// Wait on it.
				let promiseRv = await er.returnValue;

				// Push it value on the operand stack and continue.
				this.pushOperand(promiseRv);

				continue;
			}

			// If we get here, execution halted and we neither ran out of steps nor
			// got a Promise back, which means... we're done!
			return new ExecuteResult(false, stepsUsed, er.returnValue);
		}
	}

	// This executes an arbitrary (pre-parsed) function.
	public executeFunction(func: AstNode | ThisValue, param: any[], maxSteps: number): ExecuteResult {
		this.pushAction(Step.Node("Call function", AstCallExpression.Create(func, [])));
		return this.execute(maxSteps);
	}

	// Same as executeFunction(), but allows for async callbacks to happen down in code execution.
	public async executeFunctionAsync(func: AstNode | ThisValue, param: any[], maxSteps: number): Promise<ExecuteResult> {
		this.pushAction(Step.Node("Call function", AstCallExpression.Create(func, [])));
		return await this.executeAsync(maxSteps);
	}

	public executeCode(code: AstNode, maxSteps: number): ExecuteResult {
		this.pushAction(Step.Node("Supplied code", code));
		return this.execute(maxSteps);
	}

	public popAction(): Step {
		if (this._verbose)
			console.log("STEPPOPONE:", this._pipeline[this._pipeline.length - 1]);
		return this._pipeline.pop();
	}

	// Pops actions until the function returns false.
	public popActionUntil(unwinder: (Step) => boolean): void {
		while (this._pipeline.length && unwinder(this._pipeline[this._pipeline.length - 1])) {
			let popped = this._pipeline.pop();
			if (this._verbose)
				console.log("STEPPOPPING:", popped);
		}
	}

	public findAction(tester: (Step) => boolean): Step {
		for (let i=this._pipeline.length - 1; i>=0; --i)
			if (tester(this._pipeline[i]))
				return this._pipeline[i];

		return null;
	}

	public printActionStack(): void {
		console.log("");
		console.log("BEGIN ACTION STACK DUMP");
		for (let i=0; i<this._pipeline.length; ++i)
			console.log(this._pipeline[i]);
		console.log("END ACTION STACK DUMP");
		console.log("");
	}

	public pushOperand(val: any): void {
		if (this._verbose)
			console.log("OPPUSH:", val);
		this._operandStack.push(val);
	}

	public popOperand(): any {
		let val = this._operandStack.pop();
		if (this._verbose)
			console.log("OPPOP:", val);
		return val;
	}

	public clearOperand(): void {
		if (this._verbose)
			console.log("OPCLEAR");
		this._operandStack = [];
	}

	public currentScope(): IScope {
		for (let i=this._pipeline.length - 1; i>=0; --i) {
			if (this._pipeline[i].scope())
				return this._pipeline[i].scope();
		}
		return this._rootScope;
	}

	private _pipeline: Step[];
	private _rootScope: IScope;
	private _operandStack: any[];
	private _verbose: boolean;
}
