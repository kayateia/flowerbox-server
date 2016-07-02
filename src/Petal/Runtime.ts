import { AstNode } from "./AstNode";
import { IActionCallback } from "./IActionCallback";
import { IScope } from "./IScope";
import { StandardScope } from "./Scopes/StandardScope";

export class SuspendException {
}
export var suspend: SuspendException = new SuspendException();

export class RuntimeErrorException {
}
export var runtimeError: RuntimeErrorException = new RuntimeErrorException();

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

	public static Scope(name: string, scope: IScope): Step {
		return new Step(null, name, null, scope);
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
		this._rootScope = new StandardScope();
		this._operandStack = [];
	}

	public pushAction(step: Step): void {
		console.log("STEPPUSH", step.name(), ":", step.node());
		this._pipeline.push(step);
	}

	public execute(steps: number): boolean {
		while (this._pipeline.length && steps--) {
			let step = this._pipeline.pop();
			console.log("STEPPOP:", step);
			try {
				step.execute(this);
			} catch (exc) {
				console.log("EXCEPTION:", exc);
				if (exc === suspend) {
					return false;
				} else if (exc === runtimeError) {
					throw exc;
				}
			}
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
		for (let i=0; i<this._pipeline.length; ++i) {
			if (this._pipeline[i].scope())
				return this._pipeline[i].scope();
		}
		return this._rootScope;
	}

	private _pipeline: Step[];
	private _rootScope: IScope;
	private _operandStack: any[];
}
