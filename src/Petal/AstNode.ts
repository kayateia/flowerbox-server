/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { Compiler } from "./Compiler";

export class Location {
	constructor(line: number, column: number) {
		this.line = line;
		this.column = column;
	}

	public line: number;
	public column: number;
}

export class AstNode {
	constructor(parseTree: any) {
		if (parseTree.loc) {
			this.loc = new Location(parseTree.loc.start.line, parseTree.loc.start.column);
		}
		// this.originalTree = parseTree;
	}

	public compile(compiler: Compiler): void {
	}

	public execute(runtime: any): any {
	}

	// public originalTree: any;

	public loc: Location;
}
