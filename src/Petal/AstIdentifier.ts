import { AstNode } from "./AstNode";
import { compile } from "./Parser";
import { Runtime } from "./Runtime";
import { LValue } from "./LValue";

export class AstIdentifier extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.name = parseTree.name;
	}

	public execute(runtime: Runtime): void {
		let scope = runtime.currentScope();

		// We don't actually push the value itself on, but rather a reference to it that
		// may be used as a left-hand (assignable) expression.
		runtime.pushOperand(new LValue(this.name, (rt) => {
			return scope.get(this.name);
		}, (rt, value) => {
			scope.set(this.name, value);
		}));
	}

	public what: string = "Identifier";
	public name: string;
}
