import { AstNode, ResultCallback } from "./AstNode";
import { Pipeline } from "./Pipeline";
import { Scope } from "./Scope";

class Step {
	constructor(node: AstNode, callback: ResultCallback) {
		this._node = node;
		this._callback = callback;
	}

	public execute(runtime: Runtime): void {
		console.log("EXECUTING:", this._node);
		this._node.execute(runtime, (result: any) => {
			console.log("RESULT:", result);
			this._callback(result);
		});
	}

	private _node: AstNode;
	private _callback: ResultCallback;
}

export class Runtime {
	constructor() {
		this._pipeline = [];
		this._scopeStack = [new Scope()];
	}

	public addStep(node: AstNode, callback: ResultCallback): void {
		this._pipeline.push(new Step(node, callback));
	}

	public execute(steps: number): boolean {
		while (this._pipeline.length && steps--) {
			let step = this._pipeline.shift();
			step.execute(this);
		}

		return true;
	}

	public currentScope(): Scope {
		return this._scopeStack[this._scopeStack.length - 1];
	}

	public addScope(): void {
		this._scopeStack.push(new Scope(this.currentScope()));
	}

	public dropScope(): void {
		this._scopeStack.pop();
	}

	private _pipeline: Step[];
	private _scopeStack: Scope[];
}
