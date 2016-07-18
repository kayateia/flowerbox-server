/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { Compiler } from "./Compiler";

export class AstNode {
	constructor(parseTree: any) {
		// this.originalTree = parseTree;
	}

	public compile(compiler: Compiler): void {
	}

	public execute(runtime: any): any {
	}

	// public originalTree: any;
}
