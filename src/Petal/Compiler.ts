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

export class Compiler {
	public program: Step[];
	public node: AstNode;
	private _loopStack: AstNode[];
	private _funcStack: AstFunction[];

	constructor() {
		this.program = [];
		this._loopStack = [];
		this._funcStack = [];
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
		return new Module(this.program, this.node);
	}

	public pushLoop(loop: AstNode): void {
		this._loopStack.push(loop);
	}

	public popLoop(): void {
		if (!this._loopStack.length)
			throw new CompileException("Loop stack underrun");

		this._loopStack.pop();
	}

	public get topLoop(): AstNode {
		if (!this._loopStack.length)
			throw new CompileException("Loop stack underrun");

		return this._loopStack[this._loopStack.length - 1];
	}

	public pushFunc(func: AstFunction): void {
		this._funcStack.push(func);
	}

	public popFunc(): void {
		if (!this._funcStack.length)
			throw new CompileException("Function stack underrun");

		this._funcStack.pop();
	}

	public get topFunc(): AstFunction {
		if (!this._funcStack.length)
			throw new CompileException("Function stack underrun");

		return this._funcStack[this._funcStack.length - 1];
	}
}
