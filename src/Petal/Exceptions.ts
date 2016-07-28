/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { Exception } from "../Exception";

// Reports some sort of problem with running the code.
export class RuntimeException extends Exception {
	constructor(cause: string, value?: any) {
		super();
		this.cause = cause;
		this.value = value;
	}

	public cause: string;
	public value: any;
}

// Reports a problem with compiling the parsed code.
export class CompileException extends Exception {
	constructor(cause: string, parseTree?: any) {
		super();
		this.cause = cause;
		this.parseTree = parseTree;
	}

	public cause: string;
	public parseTree: any;
}

// Reports a problem with parsing the input script.
export class ParseException extends Exception {
	constructor(cause: string, parseTree: any) {
		super();
		this.cause = cause;
		this.parseTree = parseTree;
	}

	public cause: string;
	public parseTree: any;
}
