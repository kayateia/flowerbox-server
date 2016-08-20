/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { Step } from "./Step";
import { AstNode } from "./AstNode";
import { AstFunction } from "./AstFunction";
import { Module } from "./Module";
import * as Strings from "../Utils/Strings";
import { Address } from "./Address";
import { CompileException } from "./Exceptions";
import { IActionCallback } from "./IActionCallback";

export class NodeStackEntry {
	constructor(name: string, node: AstNode, cleanup: IActionCallback) {
		this.name = name;
		this.node = node;
		this.cleanup = cleanup;
	}

	public name: string;
	public node: AstNode;
	public cleanup: IActionCallback;
}

export class Compiler {
	public program: Step[];
	public node: AstNode;
	private _nodeStack: NodeStackEntry[];
	private _moduleName: string;
	private _module: Module;

	constructor(moduleName: string) {
		this.program = [];
		this._nodeStack = [];
		this._moduleName = moduleName;
		this._module = null;
	}

	public emit(name: string, node: AstNode, callback: any): number {
		let address = this.pc;
		this.program.push(new Step(name, node, callback));
		return address;
	}

	public replace(pc: number, step: Step): void {
		this.program[pc] = step;
	}

	public compile(node: AstNode): void {
		this.node = node;
		this.node.compile(this);
	}

	public newLabel(node: AstNode): Address {
		return new Address(this.pc, this.module, node);
	}

	public get pc(): number {
		return this.program.length;
	}

	public get module(): Module {
		if (!this._module)
			this._module = new Module(this._moduleName, this.program, this.node);
		return this._module;
	}

	// This pushes a node on the node stack, which keeps track of where we are within
	// the AST. This is important in case a goto is required (continue, break, return).
	// This lets any pending node cleanup actions happen before jumping out.
	//
	// Note that this only needs to happen for things that might be interruptible,
	// like statements with enclosing bp push/pop, loops, functions, etc. For counter
	// example, it's not necessary in a binary expression because you can't abort one
	// in any way short of short-circuiting (which it handles in its own way).
	public pushNode(name: string, node: AstNode, cleanup: IActionCallback): void {
		this._nodeStack.push(new NodeStackEntry(name, node, cleanup));
	}

	// Pops the top node off the stack and emits its cleanup code.
	public popNode(): void {
		if (!this._nodeStack.length)
			throw new CompileException("Node stack underrun");

		let entry = this._nodeStack.pop();
		this.emitNode(entry);
	}

	// Emits an entry from the node stack.
	public emitNode(entry: NodeStackEntry): void {
		this.emit(entry.name, entry.node, entry.cleanup);
	}

	// Returns the Nth value back from the top of the stack.
	public getNode(index: number): NodeStackEntry {
		if (this._nodeStack.length <= index)
			throw new CompileException("Node stack underrun");

		return this._nodeStack[this._nodeStack.length - (1 + index)];
	}
}
