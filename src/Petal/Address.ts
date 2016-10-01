/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { Module } from "./Module";

// This represents a program execution address by all the means which we might be
// interested - pc to find our place in the compiled code again, module to figure
// out which program we're in, and node for things like stack traces.
//
// We also throw in "this" here because the "this" value is relevant in a number
// of contexts, like keeping track of "caller" and stack traces.
export class Address {
	constructor(pc: number, module: Module, node: AstNode) {
		this.pc = pc;
		this.module = module;
		this.node = node;
		this.func = null;
		this.thisValue = null;
		this.injections = {};
		this.securityContext = null;
	}

	// Call to make an Address that points to a native function.
	public static Function(func: any): Address {
		let addr = new Address(null, null, null);
		addr.func = func;
		return addr;
	}

	public copy(): Address {
		let addr = new Address(this.pc, this.module, this.node);
		addr.func = this.func;
		addr.thisValue = this.thisValue;
		addr.injections = this.injections;
		addr.securityContext = this.securityContext;
		return addr;
	}

	public pc: number;
	public module: Module;
	public node: AstNode;
	public func: any;
	public thisValue: any;
	public injections: any;
	public securityContext: number;
}
