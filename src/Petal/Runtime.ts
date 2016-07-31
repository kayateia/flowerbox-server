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
import { Value } from "./Value";
import * as CorePromises from "../Async/CorePromises";
import { Step } from "./Step";
import { Module } from "./Module";
import { Address } from "./Address";
import { FixedStack } from "./FixedStack";
import { Compiler } from "./Compiler";
import { IPetalWrapper } from "./Objects";

import * as LibFunctional from "./Lib/Functional";
import * as LibMath from "./Lib/Math";

let runtimeLib = new ConstScope(null, new Map<string, any>());
let runtimeRegistered = false;

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

export interface IChangeNotification {
	(item: IPetalWrapper, runtime: Runtime): void
}

export class Runtime {
	public address: Address;
	public returnValue: any;

	// This is data passed to the getAccessor method in IObject. It lets you customize
	// the actions of your IObjects if needed.
	public accessorCargo: any;

	private _programStack: FixedStack<Address>;
	private _scopeStack: FixedStack<IScope>;

	private _operandStack: FixedStack<any>;

	private _baseStack: FixedStack<number>;

	private _setPC: boolean;

	private _verbose: boolean;

	private _rootScope: IScope;
	private _scopeCatcher: IScopeCatcher;

	private _changeNotification: IChangeNotification;

	constructor(verbose?: boolean, scopeCatcher?: IScopeCatcher, changeNotification?: IChangeNotification, accessorCargo?: any) {
		this._setPC = false;

		this._operandStack = new FixedStack<any>();

		this._baseStack = new FixedStack<number>();

		this._programStack = new FixedStack<Address>();
		this._scopeStack = new FixedStack<IScope>();
		this._verbose = verbose;

		this._scopeCatcher = scopeCatcher;
		this._rootScope = new StandardScope(runtimeLib);

		this._changeNotification = changeNotification;

		this.accessorCargo = accessorCargo;

		if (!runtimeRegistered) {
			runtimeRegistered = true;
			LibFunctional.registerAll(runtimeLib);
			LibMath.registerAll(runtimeLib);
		}
	}

	public execute(steps?: number): ExecuteResult {
		let stepsUsed = 0, stepsTotal = steps;

		while (this.address.pc < this.address.module.program.length) {
			if (this.verbose) {
				let step = this.address.module.program[this.address.pc];
				console.log("STEP AT PC", this.address.pc, ":", step.name, ",", (<any>step.node).what, ",", step.callback.toString());
			}
			let stepReturn = this.address.module.program[this.address.pc].execute(this);
			if (!this._setPC)
				++this.address.pc;
			else
				this._setPC = false;

			if (stepReturn instanceof Promise) {
				return new ExecuteResult(false, stepsUsed, stepReturn);
			}

			if (stepsTotal && !steps--) {
				return new ExecuteResult(true, stepsUsed, null);
			} else
				++stepsUsed;
			/*if (!(this.address instanceof Address))
				throw new RuntimeException("this.address isn't a valid Address", this.address); */
		}

		let returnValue = null;
		if (!this._operandStack.empty)
			returnValue = this.popOperand();

		while (!this._operandStack.empty)
			console.log("LEFTOVER OP", this.popOperand());

		for (let i=0; i<this._baseStack.count; ++i)
			console.log("LEFTOVER BP", this._baseStack.get(i));

		while (!this._programStack.empty)
			console.log("LEFTOVER PG", this._programStack.pop());

		while (!this._scopeStack.empty)
			console.log("LEFTOVER SC", this._scopeStack.pop());

		return new ExecuteResult(false, stepsUsed, returnValue);
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

	public executeCode(code: AstNode, injections: any, maxSteps?: number): ExecuteResult {
		if (injections) {
			this.pushScope(ConstScope.FromObject(this.currentScope, injections));
			this.pushScope(new StandardScope(this.currentScope));
		}
		var compiler = new Compiler();
		compiler.compile(code);
		this.setInitialPC(new Address(0, compiler.module, code));
		return this.execute(maxSteps);
	}

	public async executeCodeAsync(code: AstNode, injections: any, maxSteps?: number): Promise<ExecuteResult> {
		if (injections) {
			this.pushScope(ConstScope.FromObject(this.currentScope, injections));
			this.pushScope(new StandardScope(this.currentScope));
		}
		var compiler = new Compiler();
		compiler.compile(code);
		this.setInitialPC(new Address(0, compiler.module, code));
		return await this.executeAsync(maxSteps);
	}

	// This executes an arbitrary (pre-parsed) function.
	public executeFunction(func: Address, param: any[], caller: any, maxSteps?: number): ExecuteResult {
		let address = AstCallExpression.Create(func, param, caller);
		this.setInitialPC(address);
		return this.execute(maxSteps);
	}

	// Same as executeFunction(), but allows for async callbacks to happen down in code execution.
	public async executeFunctionAsync(func: Address, param: any[], caller: any, maxSteps?: number): Promise<ExecuteResult> {
		let address = AstCallExpression.Create(func, param, caller);
		this.setInitialPC(address);
		return await this.executeAsync(maxSteps);
	}

	// Called by IPetalWrappers when changes are made inside themselves.
	public notifyChange(target: IPetalWrapper): void {
		if (this.verbose)
			console.log("CHANGED", target, "TAG", target.tag);
		if (this._changeNotification)
			this._changeNotification(target, this);
	}

	public pushPC(address?: Address): void {
		if (this.verbose)
			console.log("PUSHPC", address);
		if (!address)
			address = this.address;
		this._programStack.push(address.copy());
	}

	public popPC(): void {
		// We have to create a new Address here to avoid mucking up the source Address.
		let address = this._programStack.pop();
		this.address = address.copy();
		this._setPC = true;

		if (this.verbose)
			console.log("POPPC", address);
	}

	// Sets a new program counter; if allowPCAdvance is true, then the PC will
	// be incremented before executing the next step as normal; otherwise this
	// behavior is inhibited. This is to work properly with things like function
	// calls, where the normal behavior will skip over the function's first
	// instruction.
	public gotoPC(address: Address, allowPCAdvance?: boolean): void {
		if (this.verbose)
			console.log("GOTOPC", address, allowPCAdvance);

		// See above in popPC().
		this.address = address.copy();
		this._setPC = !allowPCAdvance;
	}

	// Alias for gotoPC(address, true)
	public setInitialPC(address: Address): void {
		this.gotoPC(address, true);
	}

	// This is like a combo push/goto, but it also makes sure that the pushed
	// address is the next one after the current one, so we don't get an infinite
	// call loop.
	public callPC(address: Address): void {
		let newAddr = this.address.copy();
		newAddr.pc++;
		this.pushPC(newAddr);
		this.gotoPC(address);
	}

	// Returns the Nth stack frame from the program stack. Note that the 0th frame
	// is actually the currently executing function.
	public getPC(index: number): Address {
		if (index === 0)
			return this.address;
		return this._programStack.get(index - 1);
	}

	// Returns the number of stack frames on the program stack.
	public get countPC(): number {
		return this._programStack.count + 1;
	}

	// Pops the top value off the program stack and discards it.
	public discardPC(): void {
		let val = this._programStack.pop();
		if (this.verbose)
			console.log("DISCARD PC", val);
	}

	public pushScope(scope: IScope): void {
		if (this.verbose)
			console.log("PUSHSCOPE", scope);
		this._scopeStack.push(scope);
	}

	public popScope(): IScope {
		let value = this._scopeStack.pop();
		if (this.verbose)
			console.log("POPSCOPE", value);
		return value;
	}

	public get currentScope(): IScope {
		if (!this._scopeStack.empty)
			return this._scopeStack.get(0);
		return this._rootScope;
	}

	public pushOperand(val: any): void {
		if (this._verbose)
			console.log("PUSHOP:", val);

		this._operandStack.push(val);
		/*if (this._verbose)
			console.log("OPSTACK IS", this._operandStack);*/
	}

	public popOperand(): any {
		let val = this._operandStack.pop();
		if (this._verbose) {
			console.log("POPOP:", val);
			// console.log("OPSTACK IS", this._operandStack);
		}
		return val;
	}

	public getOperand(index: number): any {
		return this._operandStack.get(index);
	}

	public setOperand(index: number, value: any): void {
		this._operandStack.set(index, value);
	}

	public discardOperands(count: number): void {
		this._operandStack.popMany(count);
	}

	public pushBase(): void {
		if (this.verbose)
			console.log("PUSHBP", this._operandStack.count);

		this._baseStack.push(this._operandStack.count);
	}

	public popBase(): void {
		let opptr = this._baseStack.pop();
		if (opptr > this._operandStack.count)
			throw new RuntimeException("Base pointer is higher than the operand stack's top");

		if (this.verbose)
			console.log("POPBP down", opptr);

		this._operandStack.popMany(this._operandStack.count - opptr);
	}

	/*

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
