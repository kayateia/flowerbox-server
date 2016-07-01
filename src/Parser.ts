///<reference path="../typings/globals/require/index.d.ts" />

export class AstNode {
	constructor(parseTree: any) {
		// this.originalTree = parseTree;
	}

	// public originalTree: any;
}

export class AstStatements extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.body = parseTree.body.map(compile);
	}

	public what: string = "Statements";
	public body: AstNode[];
}

export class AstStatement extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.statement = compile(parseTree.expression);
	}

	public what: string = "Statement";
	public statement: AstNode;
}

export class AstFunction extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		if (parseTree.id)
			this.name = parseTree.id.name;
		this.params = parseTree.params.map((i) => i.name);
		this.body = new AstStatements(parseTree.body);
	}

	public what: string = "Function";
	public name: string;
	public params: string[];
	public body: AstStatements;
}

export class AstIdentifier extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.name = parseTree.name;
	}

	public what: string = "Identifier";
	public name: string;
}

export class AstMemberExpression extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		var objAny: any = compile(parseTree.object);
		this.obj = objAny;
		this.member = parseTree.property.name;
	}

	public what: string = "MemberExpression";
	public obj: AstIdentifier;
	public member: string;
}

export class AstBinaryExpression extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.operator = parseTree.operator;
		this.left = compile(parseTree.left);
		this.right = compile(parseTree.right);
	}

	public what: string = "BinaryExpression";
	public operator: string;
	public left: AstNode;
	public right: AstNode;
}

export class AstCallExpression extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.callee = compile(parseTree.callee);
		this.param = parseTree.arguments.map(compile);
	}
	public what: string = "CallExpression";
	public callee: AstNode;
	public param: AstNode[];
}

export class AstReturn extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.arg = compile(parseTree.argument);
	}
	public what: string = "CallExpression";
	public arg: AstNode;
}

export class AstLiteral extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.value = parseTree.value;
	}
	public what: string = "Literal";
	public value: any;
}

export class AstVarDecl extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.name = parseTree.id.name;
		this.init = compile(parseTree.init);
	}

	public what: string = "VarDecl";
	public name: string;
	public init: AstNode;
}

export class AstVar extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		var varsAny: any = parseTree.declarations.map(compile);
		this.vars = varsAny;
	}

	public what: string = "Var";
	public vars: AstVarDecl[];
}

export class AstUpdate extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.operator = parseTree.operator;
		this.arg = compile(parseTree.argument);
		this.prefix = parseTree.prefix;
	}

	public what: string = "Update";
	public operator: string;
	public arg: AstNode;
	public prefix: boolean;
}

export class AstFor extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);
		this.init = compile(parseTree.init);
		this.test = compile(parseTree.test);
		this.update = compile(parseTree.update);
		this.body = compile(parseTree.body);
	}

	public what: string = "For";
	public init: AstNode;
	public test: AstNode;
	public update: AstNode;
	public body: AstNode;
}

function compile(parseTree: any): AstNode {
	let result: AstNode;
	switch(parseTree.type) {
		case "Program":
			result = new AstStatements(parseTree);
			break;
		case "FunctionExpression":
		case "FunctionDeclaration":
			result = new AstFunction(parseTree);
			break;
		case "BlockStatement":
			result = new AstStatements(parseTree);
			break;
		case "Identifier":
			result = new AstIdentifier(parseTree);
			break;
		case "MemberExpression":
			result = new AstMemberExpression(parseTree);
			break;
		case "BinaryExpression":
			result = new AstBinaryExpression(parseTree);
			break;
		case "CallExpression":
			result = new AstCallExpression(parseTree);
			break;
		case "ExpressionStatement":
			result = new AstStatement(parseTree);
			break;
		case "ReturnStatement":
			result = new AstReturn(parseTree);
			break;
		case "Literal":
			result = new AstLiteral(parseTree);
			break;
		case "VariableDeclaration":
			result = new AstVar(parseTree);
			break;
		case "VariableDeclarator":
			result = new AstVarDecl(parseTree);
			break;
		case "ForStatement":
			result = new AstFor(parseTree);
			break;
	}

	// console.log("converted", JSON.stringify(parseTree, null, 4), " to ", JSON.stringify(result, null, 4));
	return result;
}

export function compileFromSource(src: string) {
	let parser: any = require("../lib/script");
	let parseTree: any = parser.parse(src);
	return compile(parseTree);
}
