import { IActionCallback } from "./IActionCallback";

export class AstNode {
	constructor(parseTree: any) {
		// this.originalTree = parseTree;
	}

	public execute(runtime: any, callback: IActionCallback): void {
		// no-op
		if (callback)
			callback(runtime);
	}

	// public originalTree: any;
}
