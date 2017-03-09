/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { Address } from "./Address";
import { IScope } from "./IScope";
import { Runtime } from "./Runtime";

export class Markers {
	// Function marker. The address field should be filled for this with the address
	// to jump to in order to skip the function.
	public static Function: number = 1;

	// Per-statement marker.
	public static Statement: number = 2;

	// Used for cleanup of lexical scopes inside a block.
	public static Block: number = 3;

	// Used for break in switch, for, etc. This StackItem should also have a value in
	// the exitLoop member.
	public static Break: number = 4;

	// Used for pre-function-calls, for the post cleanup.
	public static Call: number = 5;

	// Used for for-in and for loops to mark the stack bottom before the next iteration.
	// This StackItem should also have a value in the nextIteration member.
	public static Continue: number = 6;

	// Placed before each try block to mark where to back out to when something fails.
	// The catch and/or finally address fields should be filled out and point to those
	// respective code blocks.
	public static Try: number = 7;

	// This is used to mark the scope delinating a catch block being executed.
	public static CatchBlock: number = 8;

	// This is used to hold the callback for a finally block.
	public static FinallyBlock: number = 9;
}

export class StackItem {
	// Only one of these will be set, with the exception of "unwinder" and "marker".
	// Those two can be combined with any of the others to provide a cleanup callback
	// and/or stack cleanup marker, respectively.

	// A program address, for returning from calls.
	address: Address;

	// These two addresses are used for loops and switch statements.
	nextIteration: Address;
	exitLoop: Address;

	// These two addresses are used for try/catch/finally blocks.
	catchAddress: Address;
	finallyAddress: Address;

	// A variable scope.
	scope: IScope;

	// An operand. Note that hasOperand should be set to true for this as well.
	// The reason for this is that the operand itself can be undefined.
	operand: any;
	hasOperand: boolean;

	// A scope marker type.
	marker: number;

	// A callback that should be called whenever a stack frame is discarded.
	unwinder: (runtime: Runtime) => void;

	// Default StackFrame is empty. The accessor methods also allow chaining so
	// that you can e.g. set a scope and an unwinder.
	constructor() {
	}

	public clear(): StackItem {
		this.address = undefined;
		this.nextIteration = undefined;
		this.exitLoop = undefined;
		this.catchAddress = undefined;
		this.finallyAddress = undefined;
		this.scope = undefined;
		this.operand = undefined;
		this.hasOperand = false;
		this.marker = undefined;
		this.unwinder = undefined;
		return this;
	}

	public isPureAddress(): boolean {
		return this.address && !this.scope && !this.hasOperand && !this.marker;
	}

	public setAddress(address: Address): StackItem {
		this.address = address;
		return this;
	}

	public setNextIteration(nextIteration: Address): StackItem {
		this.nextIteration = nextIteration;
		return this;
	}

	public setExitLoop(exitLoop: Address): StackItem {
		this.exitLoop = exitLoop;
		return this;
	}

	public setCatch(catchAddress: Address): StackItem {
		this.catchAddress = catchAddress;
		return this;
	}

	public setFinally(finallyAddress: Address): StackItem {
		this.finallyAddress = finallyAddress;
		return this;
	}

	public setScope(scope: IScope): StackItem {
		this.scope = scope;
		return this;
	}

	public setOperand(operand: any): StackItem {
		this.operand = operand;
		this.hasOperand = true;
		return this;
	}

	public setMarker(marker: number): StackItem {
		this.marker = marker;
		return this;
	}

	public setUnwinder(unwinder: (runtime: Runtime) => void): StackItem {
		this.unwinder = unwinder;
		return this;
	}
}
