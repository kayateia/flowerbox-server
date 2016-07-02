import { AstNode } from "./AstNode";
import { IActionCallback } from "./IActionCallback";
import { IScope } from "./IScope";
import { StandardScope } from "./Scopes/StandardScope";

export class Step {
	constructor(node: AstNode, name?: string, callback?: IActionCallback, scope?: IScope) {
		this._node = node;
		this._name = name;
		this._callback = callback;
		this._scope = scope;
	}

	public static ClearOperands(runtime: Runtime): Step {
		return new Step(null, "Clear Operand Stack", (v) => {
			runtime.clearOperand();
		});
	}

	public static Callback(name: string, callback: IActionCallback): Step {
		return new Step(null, name, callback);
	}

	public execute(runtime: Runtime): void {
		console.log("EXECUTING", this._name, ":", this._node);
		if (this._node)
			this._node.execute(runtime);

		if (this._callback)
			this._callback(this);
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

	public scope(): IScope {
		return this._scope;
	}

	private _node: AstNode;
	private _name: string;
	private _callback: IActionCallback;
	private _scope: IScope;
}

export class Runtime {
	constructor() {
		this._pipeline = [];
		this._scopeStack = [new StandardScope()];
		this._operandStack = [];
	}

	public pushAction(step: Step): void {
		console.log("STEPPUSH", step.name(), ":", step.node());
		this._pipeline.push(step);
	}

	public execute(steps: number): boolean {
		this._scopeStack[0].set("log", function() {
			let args = [];
			for (let i=0; i<arguments.length; ++i)
				args.push(arguments[i]);
			console.log("LOG OUTPUT:", ...args);
		});

		while (this._pipeline.length && steps--) {
			let step = this._pipeline.pop();
			console.log("STEPPOP:", step);
			step.execute(this);
		}

		return true;
	}

	public pushOperand(val: any): void {
		console.log("OPPUSH:", val);
		this._operandStack.push(val);
	}

	public popOperand(): any {
		let val = this._operandStack.pop();
		console.log("OPPOP:", val);
		return val;
	}

	public clearOperand(): void {
		console.log("OPCLEAR");
		this._operandStack = [];
	}

	public currentScope(): IScope {
		return this._scopeStack[this._scopeStack.length - 1];
	}

	public addScope(): void {
		this._scopeStack.push(new StandardScope(this.currentScope()));
	}

	public dropScope(): void {
		this._scopeStack.pop();
	}

	private _pipeline: Step[];
	private _scopeStack: IScope[];
	private _operandStack: any[];
}
