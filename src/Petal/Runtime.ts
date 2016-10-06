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
import { RuntimeException, StackFrame } from "./Exceptions";
import { Value } from "./Value";
import * as CorePromises from "../Async/CorePromises";
import { Step } from "./Step";
import { Module } from "./Module";
import { Address } from "./Address";
import { FixedStack } from "./FixedStack";
import { Compiler } from "./Compiler";
import { IPetalWrapper } from "./Objects";
import { StackItem } from "./StackItem";

import * as LibFunctional from "./Lib/Functional";
import * as LibMath from "./Lib/Math";
import * as LibConstants from "./Lib/Constants";

export let runtimeLib = new ConstScope(null, new Map<string, any>());
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
	(item: IPetalWrapper, runtime: Runtime): Promise<any>
}

export interface ICanChangeNotification {
	(item: IPetalWrapper, runtime: Runtime): Promise<boolean>
}

export class Runtime {
	public address: Address;

	// This stores the last value returned by a called Petal function.
	public returnValue: any;

	// This stores the any value leftover from the last ExpressionStatement, which is any
	// statement that is not a block (for loop, etc).
	public lastStatementValue: any;

	// This is data passed to the getAccessor method in IObject. It lets you customize
	// the actions of your IObjects if needed.
	public accessorCargo: any;

	private _stack: FixedStack<StackItem>;

	private _setPC: boolean;

	private _verbose: boolean;

	private _rootScope: IScope;
	private _scopeCatcher: IScopeCatcher;

	private _changeNotification: IChangeNotification;
	private _canChangeNotification: ICanChangeNotification;

	constructor(verbose?: boolean, scopeCatcher?: IScopeCatcher,
			changeNotification?: IChangeNotification, canChangeNotification?: ICanChangeNotification,
			accessorCargo?: any) {
		this._setPC = false;

		this._stack = new FixedStack<StackItem>(StackItem);

		this._verbose = verbose;

		this._scopeCatcher = scopeCatcher;
		this._rootScope = new StandardScope(runtimeLib);

		this._changeNotification = changeNotification;
		this._canChangeNotification = canChangeNotification;

		this.accessorCargo = accessorCargo;

		if (!runtimeRegistered) {
			runtimeRegistered = true;
			LibFunctional.registerAll(runtimeLib);
			LibMath.registerAll(runtimeLib);
			LibConstants.registerAll(runtimeLib);
		}
	}

	// Execute at the current program counter synchronously. If we encounter a step that
	// returns a promise, then return that as a result. Note that since many things will
	// return Promises these days, it's a much better idea to call executeAsync() below.
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
				return new ExecuteResult(true, stepsUsed, undefined);
			} else
				++stepsUsed;
			/*if (!(this.address instanceof Address))
				throw new RuntimeException("this.address isn't a valid Address", this.address); */
		}

		let returnValue = undefined;
		if (!this._stack.empty) {
			let operand = this._stack.get(0).operand;
			if (operand) {
				this._stack.pop();
				returnValue = operand;
			}
		}

		while (!this._stack.empty)
			console.log("LEFTOVER STACK", this.pop());

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
					return new ExecuteResult(true, stepsUsed, undefined);
			}

			// Is the return value a Promise object?
			if (er.returnValue instanceof Promise) {
				// Wait on it.
				let promiseRv = await er.returnValue;

				// Push it value on the operand stack and continue.
				this.push(new StackItem().setOperand(promiseRv));

				continue;
			}

			// Make sure it's not a wrapped value.
			er.returnValue = Value.Deref(this, er.returnValue);

			// If we get here, execution halted and we neither ran out of steps nor
			// got a Promise back, which means... we're done!
			return new ExecuteResult(false, stepsUsed, er.returnValue);
		}
	}

	private executeCodeCommon(moduleName: string, code: AstNode, injections: any, securityContext: number): void {
		if (injections) {
			this.push(new StackItem().setScope(ConstScope.FromObject(this.currentScope, injections)));
			this.push(new StackItem().setScope(new StandardScope(this.currentScope)));
		}
		var compiler = new Compiler(moduleName);
		compiler.compile(code);
		let module = compiler.module;
		module.securityContext = securityContext;
		this.setInitialPC(new Address(0, module, code));
	}

	// Executes an arbitrary block of Petal code.
	public executeCode(moduleName: string, code: AstNode, injections: any,
			securityContext: number, maxSteps?: number): ExecuteResult {
		this.executeCodeCommon(moduleName, code, injections, securityContext);

		// The return value actually comes off the lastStatementValue for the Runtime, because that's
		// where the AstStatement handler would leave it.
		let rv = this.execute(maxSteps);
		rv.returnValue = this.lastStatementValue;
		return rv;
	}

	// Executes an arbitrary block of Petal code, asynchronously.
	public async executeCodeAsync(moduleName: string, code: AstNode, injections: any,
			securityContext: number, maxSteps?: number): Promise<ExecuteResult> {
		this.executeCodeCommon(moduleName, code, injections, securityContext);

		// The return value actually comes off the lastStatementValue for the Runtime, because that's
		// where the AstStatement handler would leave it.
		let rv = await this.executeAsync(maxSteps);
		rv.returnValue = this.lastStatementValue;
		return rv;
	}

	// This executes an arbitrary (pre-parsed) function.
	public executeFunction(func: Address, param: any[], caller: any, maxSteps?: number): ExecuteResult {
		let address = AstCallExpression.Create(func, param, caller);
		this.setInitialPC(address);
		let rv = this.execute(maxSteps);

		// The return value actually comes off the returnValue for the Runtime, because that's
		// where the synthetic function call would leave it.
		rv.returnValue = Value.Deref(this, this.returnValue);

		return rv;
	}

	// This executes an arbitrary (pre-parsed) function.
	public async executeFunctionAsync(func: Address, param: any[], caller: any, maxSteps?: number): Promise<ExecuteResult> {
		let address = AstCallExpression.Create(func, param, caller);
		this.setInitialPC(address);
		let rv = await this.executeAsync(maxSteps);

		// The return value actually comes off the returnValue for the Runtime, because that's
		// where the synthetic function call would leave it.
		rv.returnValue = Value.Deref(this, this.returnValue);

		return rv;
	}

	// Called by IPetalWrappers when they want to change something inside themselves.
	public async canChange(target: IPetalWrapper): Promise<boolean> {
		if (this.verbose)
			console.log("CAN CHANGE", target, "TAG", target.tag);
		if (this._canChangeNotification)
			return await this._canChangeNotification(target, this);
		else
			return true;
	}

	// Called by IPetalWrappers when changes are made inside themselves.
	public async notifyChange(target: IPetalWrapper): Promise<any> {
		if (this.verbose)
			console.log("CHANGED", target, "TAG", target.tag);
		if (this._changeNotification)
			await this._changeNotification(target, this);
	}

	// Returns a stack trace from the current execution state.
	public getStackTrace(): StackFrame[] {
		/*let stack = [];
		if (this.address.node && this.address.node.loc)
			stack.push(new StackFrame(this.address.module.name, this.address.node.loc.line, this.address.node.loc.column));
		else
			stack.push(new StackFrame(this.address.module.name, -1, -1));

		let count = this._programStack.count;
		for (let i=0; i<count; ++i) {
			let frame = this._programStack.get(i);
			if (!frame.module) {
				// These can come from synthetic function calls.
				continue;
			}
			if (frame.node && frame.node.loc)
				stack.push(new StackFrame(frame.module.name, frame.node.loc.line, frame.node.loc.column));
			else
				stack.push(new StackFrame(frame.module.name, -1, -1));
		}

		return stack; */
		return [];
	}

	// Returns the security context the current code is running under, if any. Otherwise, returns 0.
	public get currentSecurityContext(): number {
		if (this.address.securityContext)
			return this.address.securityContext;
		else if (this.address.module)
			return this.address.module.securityContext;
		else
			return 0;
	}

	public push(item: StackItem): void {
		this._stack.push(item);
	}

	// Convenience method for pushing an operand on the stack.
	public pushOperand(value: any): void {
		this._stack.push(new StackItem().setOperand(value));
	}

	// Convenience method for pushing a scope on the stack.
	public pushScope(scope: IScope): void {
		this._stack.push(new StackItem().setScope(scope));
	}

	// Convenience method for pushing a marker on the stack.
	public pushMarker(type: number): void {
		this._stack.push(new StackItem().setMarker(type));
	}

	// Convenience method for pushing an Address on the stack.
	public pushAddress(address: Address): void {
		this._stack.push(new StackItem().setAddress(address));
	}

	public pop(): StackItem {
		return this._stack.pop();
	}

	public popMany(count: number): void {
		// We have to actually pop them off one by one here to check for callbacks.
		for (let i=0; i<count; ++i) {
			let item: StackItem = this._stack.pop();
			if (item.unwinder)
				item.unwinder(this);
		}
	}

	public popWhile(checker: (item: StackItem) => boolean) {
		while (!this._stack.empty && checker(this._stack.get(0))) {
			let item: StackItem = this._stack.pop();
			if (item.unwinder)
				item.unwinder(this);
		}
	}

	public get(index: number): StackItem {
		return this._stack.get(index);
	}

	public get count(): number {
		return this._stack.count;
	}

	public get empty(): boolean {
		return this._stack.empty;
	}

	public printStack(): void {
		console.log("STACK LISTING START");
		let count = this._stack.count;
		for (let i=0; i<count; ++i)
			console.log("STACK ITEM", this._stack.get(i));
		console.log("STACK LISTING FINISH");
	}

	public popPC(): void {
		// We have to create a new Address here to avoid mucking up the source Address.
		let addressItem = this._stack.pop();
		if (!addressItem.address)
			throw new RuntimeException("Can't return to something besides a program address", this, addressItem);

		this.address = addressItem.address.copy();
		this._setPC = true;

		if (this.verbose)
			console.log("POPPC", addressItem.address);
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
		this.pushAddress(newAddr);
		this.gotoPC(address);
	}

	public get currentScope(): IScope {
		// Dig the top scope out of the stack if we have one.
		let count = this._stack.count;
		for (let i=0; i<count; ++i) {
			let item = this._stack.get(i);
			if (item.scope)
				return item.scope;
		}

		// If we get here, there's no scope in the stack. Just return the root.
		return this._rootScope;
	}

	public get verbose(): boolean {
		return this._verbose;
	}

	public get scopeCatcher(): IScopeCatcher {
		return this._scopeCatcher;
	}
}
