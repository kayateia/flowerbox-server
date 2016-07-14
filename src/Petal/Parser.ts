/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

///<reference path="../../typings/globals/node/index.d.ts" />

import { AstArray } from "./AstArray";
import { AstAssignment } from "./AstAssignment";
import { AstBinaryExpression } from "./AstBinaryExpression";
import { AstBreak } from "./AstBreak";
import { AstCallExpression } from "./AstCallExpression";
import { AstConditional } from "./AstConditional";
import { AstContinue } from "./AstContinue";
import { AstFor } from "./AstFor";
import { AstForIn } from "./AstForIn";
import { AstFunction } from "./AstFunction";
import { AstIdentifier } from "./AstIdentifier";
import { AstLiteral } from "./AstLiteral";
import { AstMemberExpression } from "./AstMemberExpression";
import { AstNode } from "./AstNode";
import { AstObject } from "./AstObject";
import { AstReturn } from "./AstReturn";
import { AstStatement } from "./AstStatement";
import { AstStatements } from "./AstStatements";
import { AstSwitch } from "./AstSwitch";
import { AstUnaryExpression } from "./AstUnaryExpression";
import { AstUpdate } from "./AstUpdate";
import { AstVarStatement } from "./AstVarStatement";
import { AstVarDecl } from "./AstVarDecl";
import { ParseException } from "./Exceptions";

// This is exported primarily for testing.
export function compile(parseTree: any): AstNode {
	let result: AstNode;
	switch(parseTree.type) {
		case "Program":
			// There's no reason to mark this as a block scope since we'll have pushed on
			// a global scope anyway.
			result = new AstStatements(parseTree, false);
			break;
		case "FunctionExpression":
		case "FunctionDeclaration":
			result = new AstFunction(parseTree);
			break;
		case "BlockStatement":
			result = new AstStatements(parseTree, true);
			break;
		case "Identifier":
		case "ThisExpression":
			result = new AstIdentifier(parseTree);
			break;
		case "MemberExpression":
			result = new AstMemberExpression(parseTree);
			break;
		case "BinaryExpression":
			result = new AstBinaryExpression(parseTree);
			break;
		case "UnaryExpression":
			result = new AstUnaryExpression(parseTree);
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
		case "BreakStatement":
			result = new AstBreak(parseTree);
			break;
		case "ContinueStatement":
			result = new AstContinue(parseTree);
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
		case "ForInStatement":
			result = new AstForIn(parseTree);
			break;
		case "ConditionalExpression":
		case "IfStatement":
			result = new AstConditional(parseTree);
			break;
		case "AssignmentExpression":
			result = new AstAssignment(parseTree);
			break;
		case "UpdateExpression":
			result = new AstUpdate(parseTree);
			break;
		case "ObjectExpression":
			result = new AstObject(parseTree);
			break;
		case "ArrayExpression":
			result = new AstArray(parseTree);
			break;
		case "SwitchStatement":
			result = new AstSwitch(parseTree);
			break;
		default:
			throw new ParseException("Unknown compile() token '"+ parseTree.type + "'", parseTree);
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
