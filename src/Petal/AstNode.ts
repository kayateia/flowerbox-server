export interface ResultCallback {
	(any): void
}

export class AstNode {
	constructor(parseTree: any) {
		// this.originalTree = parseTree;
	}

	public execute(runtime: any, callback: ResultCallback): void {
	}

	// public originalTree: any;
}
