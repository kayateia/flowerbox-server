///<reference path="../../typings/globals/require/index.d.ts" />

import { AstAssignment } from "./AstAssignment";
import { AstBinaryExpression } from "./AstBinaryExpression";
import { AstCallExpression } from "./AstCallExpression";
import { AstConditional } from "./AstConditional";
import { AstFor } from "./AstFor";
import { AstFunction } from "./AstFunction";
import { AstIdentifier } from "./AstIdentifier";
import { AstLiteral } from "./AstLiteral";
import { AstMemberExpression } from "./AstMemberExpression";
import { AstNode } from "./AstNode";
import { AstReturn } from "./AstReturn";
import { AstStatement } from "./AstStatement";
import { AstStatements } from "./AstStatements";
import { AstUpdate } from "./AstUpdate";
import { AstVarStatement } from "./AstVarStatement";
import { AstVarDecl } from "./AstVarDecl";

// This is exported primarily for testing.
export function compile(parseTree: any): AstNode {
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
			result = new AstVarStatement(parseTree);
			break;
		case "VariableDeclarator":
			result = new AstVarDecl(parseTree);
			break;
		case "ForStatement":
			result = new AstFor(parseTree);
			break;
		case "ConditionalExpression":
			result = new AstConditional(parseTree);
			break;
		case "AssignmentExpression":
			result = new AstAssignment(parseTree);
			break;
	}

	// console.log("converted", JSON.stringify(parseTree, null, 4), " to ", JSON.stringify(result, null, 4));
	return result;
}

let parser: any = require("../../lib/PetalGrammar");

// This is exported primarily for testing.
export function compileToTree(src: string) {
	return parser.parse(src);
}

export function compileFromSource(src: string) {
	let parseTree: any = compileToTree(src);
	return compile(parseTree);
}
