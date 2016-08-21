/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { Step } from "./Step";

// A program module - this is a set of compiled code specific to the code
// snippet from which it came. Calls may happen between these, for things
// compiled at different times, like different Wob verbs.
export class Module {
	constructor(name: string, program: Step[], node: AstNode) {
		this.name = name;
		this.program = program;
		this.node = node;
	}

	public name: string;
	public program: Step[];
	public node: AstNode;

	// This defines a wob ID under which this code runs. For example, if the
	// player types an immediate command, this will be the player's wob ID. If
	// it's a verb on wob #52, this will be 52.
	public securityContext: number;
}
