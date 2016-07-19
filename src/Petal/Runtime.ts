/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstCallExpression } from "./AstCallExpression";
import { IActionCallback } from "./IActionCallback";
import { IScope, IScopeCatcher } from "./IScope";
import { StandardScope } from "./Scopes/StandardScope";
import { ConstScope } from "./Scopes/ConstScope";
import { RuntimeException } from "./Exceptions";
import { ThisValue } from "./ThisValue";
import { Value } from "./Value";
import * as CorePromises from "../Async/CorePromises";
import { Step } from "./Step";
import { Module } from "./Module";
import { Address } from "./Address";

/*import * as LibFunctional from "./Lib/Functional";
import * as LibMath from "./Lib/Math";

let runtimeLib = new ConstScope(null, new Map<string, any>());
let runtimeRegistered = false; */

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
	public address: Address;
	private _programStack: Address[];
	private _scopeStack: IScope[];
	private _operandStack: any[];
	private _baseStack: number[];
	private _setPC: boolean;

	// We'll just make these raw values for now.
	public returnValue: any;

	private _verbose: boolean;

	private _rootScope: IScope;
	private _scopeCatcher: IScopeCatcher;

	constructor(verbose?: boolean, scopeCatcher?: IScopeCatcher) {
		this._operandStack = [];
		this._baseStack = [];
		this._programStack = [];
		this._scopeStack = [];
		this._verbose = verbose;

		this._scopeCatcher = scopeCatcher;
		this._rootScope = new StandardScope();
		// this._rootScope = new StandardScope(runtimeLib);

		/*if (!runtimeRegistered) {
			runtimeRegistered = true;
			LibFunctional.registerAll(runtimeLib);
			LibMath.registerAll(runtimeLib);
		} */
	}

	public execute(): any {
		while (this.address.pc < this.address.module.program.length) {
			if (this.verbose) {
				let step = this.address.module.program[this.address.pc];
				console.log("STEP:", step.name, ",", (<any>step.node).what, ",", step.callback.toString());
			}
			this.address.module.program[this.address.pc].execute(this);
			if (!this._setPC)
				++this.address.pc;
			else
				this._setPC = false;
		}

		while (this._operandStack.length > 0)
			console.log("LEFTOVER OP", this.popOperand());

		while (this._baseStack.length > 0)
			console.log("LEFTOVER BP", this._baseStack.pop());

		while (this._programStack.length > 0)
			console.log("LEFTOVER PG", this._programStack.pop());

		while (this._scopeStack.length > 0)
			console.log("LEFTOVER SC", this._scopeStack.pop());
	}

	public pushPC(address?: Address): void {
		if (!address)
			address = this.address;
		this._programStack.push(address);
	}

	public popPC(): void {
		// We have to create a new Address here to avoid mucking up the source Address.
		let address = this._programStack.pop();
		this.address = new Address(address.pc, address.module, address.node);
		this._setPC = true;
	}

	public gotoPC(address: Address): void {
		// See above in popPC().
		this.address = new Address(address.pc, address.module, address.node);
		this._setPC = true;
	}

	// This is like a combo push/goto, but it also makes sure that the pushed
	// address is the next one after the current one, so we don't get an infinite
	// call loop.
	public callPC(address: Address): void {
		this.pushPC(new Address(this.address.pc + 1, this.address.module, this.address.node));
		this.gotoPC(address);
	}

	public pushScope(scope: IScope): void {
		this._scopeStack.push(scope);
	}

	public popScope(): IScope {
		return this._scopeStack.pop();
	}

	public get currentScope(): IScope {
		if (this._scopeStack.length)
			return this._scopeStack[this._scopeStack.length-1];
		return this._rootScope;
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

	public getOperand(index: number): any {
		if (index >= this._operandStack.length)
			throw new RuntimeException("Operand stack underflow");

		return this._operandStack[this._operandStack.length - (index+1)];
	}

	public discardOperands(count: number): void {
		if (count > this._operandStack.length)
			throw new RuntimeException("Operand stack underflow");

		for (let i=0; i<count; ++i)
			this.popOperand();
	}

	public pushBase(): void {
		this._baseStack.push(this._operandStack.length);
	}

	public popBase(): void {
		let count = this._baseStack.pop();
		if (count > this._operandStack.length)
			throw new RuntimeException("Base pointer is higher than the operand stack's top");

		this._operandStack = this._operandStack.slice(0, count);
	}

	/* public pushAction(step: Step): void {
		if (this._verbose)
			console.log("STEPPUSH", step.name(), ":", step.node(), ":", step.scope());
		this._pipeline.push(step);
	}

	public execute(steps?: number): ExecuteResult {
		let stepsUsed = 0, stepsTotal = steps;
		let stopEarlyValue = null;
		while (this._pipeline.length && (steps === undefined || steps === null || steps--)) {
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

	public async executeAsync(steps?: number): Promise<ExecuteResult> {
		let stepsUsed = 0;
		while (true) {
			// Start out executing code.
			let thisSteps = !steps ? null : Math.min(steps - stepsUsed, 10000);
			let er = this.execute(thisSteps);
			stepsUsed += er.stepsUsed;

			// Did we run out of total steps? If so, either yield or bail.
			if (er.outOfSteps) {
				if (stepsUsed < steps) {
					await CorePromises.delay(1);
					continue;
				} else
					return new ExecuteResult(true, stepsUsed, null);
			}

			// Is the return value a Promise object?
			if (er.returnValue instanceof Promise) {
				// Wait on it.
				let promiseRv = await er.returnValue;

				// Push it value on the operand stack and continue.
				this.pushOperand(promiseRv);

				continue;
			}

			// Make sure it's not a wrapped value.
			er.returnValue = Value.Deref(this, er.returnValue);

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

	public executeCode(code: AstNode, injections: any, maxSteps: number): ExecuteResult {
		if (injections) {
			this.pushAction(Step.Scope("Injections scope", ConstScope.FromObject(this.currentScope(), injections)));
			this.pushAction(Step.Scope("Replacement root scope", new StandardScope(this.currentScope())));
		}
		this.pushAction(Step.Node("Supplied code", code));
		return this.execute(maxSteps);
	}

	public async executeCodeAsync(code: AstNode, injections: any, maxSteps: number): Promise<ExecuteResult> {
		if (injections) {
			this.pushAction(Step.Scope("Injections scope", ConstScope.FromObject(this.currentScope(), injections)));
			this.pushAction(Step.Scope("Replacement root scope", new StandardScope(this.currentScope())));
		}
		this.pushAction(Step.Node("Supplied code", code));
		return await this.executeAsync(maxSteps);
	}

	public pushCallerValue(value: any): void {
		AstCallExpression.PushPreviousThisValue(this, value);
	}

	public popAction(): Step {
		if (this._verbose)
			console.log("STEPPOPONE:", this._pipeline[this._pipeline.length - 1]);
		return this._pipeline.pop();
	}

	// Pops actions until the function returns false.
	public popActionWhile(unwinder: (Step) => boolean): void {
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
	} */

	public get verbose(): boolean {
		return this._verbose;
	}

	public get scopeCatcher(): IScopeCatcher {
		return this._scopeCatcher;
	}
}
