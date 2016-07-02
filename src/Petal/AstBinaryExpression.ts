import { AstNode } from "./AstNode";
import { Step, Runtime } from "./Runtime";
import { compile } from "./Parser";
import { LValue } from "./LValue";

export class AstBinaryExpression extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.operator = parseTree.operator;
		this.left = compile(parseTree.left);
		this.right = compile(parseTree.right);
	}

	public execute(runtime: Runtime): void {
		runtime.pushAction(Step.Callback("Binary comparison", () => {
			let v1 = LValue.PopAndDeref(runtime);
			let v2 = LValue.PopAndDeref(runtime);
			let result: any;
			switch (this.operator) {
				case "-":
					result = v1 - v2;
					break;
				case "+":
					result = v1 + v2;
					break;
				case "/":
					result = v1 / v2;
					break;
				case "*":
					result = v1 * v2;
					break;
				case "<":
					result = v1 < v2;
					break;
				case ">":
					result = v1 > v2;
					break;
				case "<=":
					result = v1 <= v2;
					break;
				case ">=":
					result = v1 >= v2;
					break;
				case "==":
				case "===":
					result = v1 === v2;
					break;
				case "!=":
				case "!==":
					result = v1 !== v2;
					break;
			}

			runtime.pushOperand(result);
		}));
		runtime.pushAction(new Step(this.left, "BC left"));
		runtime.pushAction(new Step(this.right, "BC right"));
	}

	public what: string = "BinaryExpression";
	public operator: string;
	public left: AstNode;
	public right: AstNode;
}
