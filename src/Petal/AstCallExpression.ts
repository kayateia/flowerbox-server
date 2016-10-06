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
import { Utils } from "./Utils";
import { Compiler } from "./Compiler";
import { Address } from "./Address";
import { StackItem, Markers } from "./StackItem";

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

	// Generates a synthetic module containing the code needed to make a function
	// call into some other code. Assumes that "address" refers to a Petal function
	// and not an external function.
	public static Create(address: Address, param: any[], caller: any): Address {
		let compiler = new Compiler("<trampoline>");
		let newNode = new AstNode({});
		compiler.emit("Synthetic call", newNode, (runtime: Runtime) => {
			runtime.pushMarker(Markers.Call);

			param.forEach(p => runtime.pushOperand(p));
			runtime.pushOperand(param.length);
			runtime.pushOperand(address);

			let callerAddress: Address = compiler.newLabel(newNode);
			callerAddress.thisValue = caller;
			runtime.address = callerAddress;

			runtime.callPC(address);
		});
		compiler.emit("Synthetic call cleanup", newNode, (runtime: Runtime) => {
			// This pops everything up to callerAddress, and then pops callerAddress itself.
			runtime.popWhile(i => i.marker !== Markers.Call);
			runtime.pop();
			runtime.pushOperand(runtime.returnValue);
		});

		return new Address(0, compiler.module, newNode);
	}

	public compile(compiler: Compiler): void {
		compiler.emit("Call marker", this, (runtime: Runtime) => {
			runtime.pushMarker(Markers.Call);
		});

		this.arguments.forEach(a => a.compile(compiler));
		(<AstNode>this.callee).compile(compiler);

		compiler.emit("Call", this, (runtime: Runtime) => {
			// Deref all of the arguments - no passing l-values past a function boundary.
			for (let i=this.arguments.length-1; i>=0; --i) {
				let item = runtime.get(1 + i);
				if (runtime.verbose)
					console.log("DEREF ARG", item.operand, Value.Deref(runtime, item.operand));
				item.operand = Value.Deref(runtime, item.operand);
			}

			// The top item on the stack should be an address or a native function.
			// If it's a native function, we just pop off the parameters and call it.
			let address: Address = Value.Deref(runtime, runtime.get(0).operand);
			if (runtime.verbose) {
				console.log("DEREF CALLEE", runtime.get(0).address, address);
				console.log("CALLING", address);
			}
			if (!(address instanceof Address))
				throw new RuntimeException("Address is not an Address", runtime, address);

			if (address.func) {
				let args = [];
				for (let i=this.arguments.length-1; i>=0; --i)
					args.push(runtime.get(1 + i).operand);

				let result = address.func(...args);
				if (result instanceof Promise) {
					// FIXME: Need to do something with catch() here.
					return result.then((val: any) => {
						runtime.returnValue = val;
					});
				} else
					runtime.returnValue = result;
			} else {
				// See if we got an l-value as the callee. If we did, look for a "this" value
				// and include it with the address for the program stack.
				let addressL: LValue = runtime.get(0).operand;
				let thisValue: any = null;
				if (LValue.IsLValue(addressL))
					thisValue = addressL.thisValue;
				address = address.copy();
				address.thisValue = thisValue;

				// Push our argument count on the stack so we know how many things are available
				// on the other end. We have to pop off the caller so we can put the count
				// underneath that.
				runtime.pop();
				runtime.pushOperand(this.arguments.length);
				runtime.pushOperand(address);

				// Push our current location on the stack (the return address) and set the new location.
				runtime.callPC(address);
			}
		});
		compiler.emit("Call cleanup", this, (runtime: Runtime) => {
			let returnValue = runtime.returnValue;
			// This pops everything up to callerAddress, and then pops callerAddress itself.
			runtime.popWhile(i => i.marker !== Markers.Call);
			runtime.pop();
			runtime.pushOperand(returnValue);
		});
	}

	public what: string = "CallExpression";
	public callee: AstNode;
	public arguments: AstNode[];

	public literalParams: any[];
}
