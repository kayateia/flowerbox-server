/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { Step } from "./Step";
import { AstNode } from "./AstNode";
import { Module } from "./Module";
import * as Strings from "../Utils/Strings";
import { Address } from "./Address";

export class Compiler {
	public program: Step[];
	public node: AstNode;

	constructor() {
		this.program = [];
	}

	public emit(step: Step): number {
		let address = this.pc;
		this.program.push(step);
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
}
