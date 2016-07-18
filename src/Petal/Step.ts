/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { Runtime } from "./Runtime";
import { IActionCallback } from "./IActionCallback";

export class Step {
	constructor(name: string, node: AstNode, callback: IActionCallback) {
		this._name = name;
		this._node = node;
		this._callback = callback;
	}

	public execute(runtime: Runtime): any {
		let result;

		if (this._callback)
			result = this._callback(runtime);

		return result;
	}

	public node(): AstNode {
		return this._node;
	}

	public name(): string {
		return this._name;
	}

	public callback(): IActionCallback {
		return this._callback;
	}

	private _node: AstNode;
	private _name: string;
	private _callback: IActionCallback;
}
