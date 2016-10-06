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
	private _moduleName: string;
	private _module: Module;

	constructor(moduleName: string) {
		this.program = [];
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
}
