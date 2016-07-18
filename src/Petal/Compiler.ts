/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { Step } from "./Step";

export class Compiler {
	public program: Step[];

	constructor() {
		this.program = [];
	}

	public emit(step: Step): number {
		let address = this.program.length;
		this.program.push(step);
		return address;
	}

	public replace(pc: number, step: Step): void {
		this.program[pc] = step;
	}
}
