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

export function parse(parseTree: any): AstNode {
	let result: AstNode;
	switch(parseTree.type) {
		case "Program":
			// There's no reason to mark this as a block scope since we'll have pushed on
			// a global scope anyway.
			result = new AstStatements(parseTree, false);
			break;
		case "FunctionExpression":
		case "FunctionDeclaration":
		case "ArrowFunctionExpression":
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
		case "LogicalExpression":	// This is not actually correct, but it will get us started.
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
			throw new ParseException("Unknown parse() token '"+ parseTree.type + "'", parseTree);
	}

	// console.log("converted", JSON.stringify(parseTree, null, 4), " to ", JSON.stringify(result, null, 4));
	return result;
}

let acorn: any = require("../../lib/acorn-petal");

// We have to patch the parser to allow for #n and @foo. Ideally this would be done
// through the plugin architecture, but it doesn't expose what we need.
/*let oldIsIdentStart = acorn.isIdentifierStart;
acorn.isIdentifierStart = function(code, astral) {
	console.log("isStart", code);
	if (code === 64 || code === 35)
		return true;
	else
		return oldIsIdentStart(code, astral);
}

let oldIsIdentChar = acorn.isIdentifierChar;
acorn.isIdentifierChar = function(code, astral) {
	console.log("isChar", code);
	if (code === 64 || code === 35)
		return true;
	else
		return oldIsIdentChar(code, astral);
} */

// This is exported primarily for testing.
export function parseToTree(src: string) {
	var ast = acorn.parse(src, {
		locations: true
	});
	return ast;
}

export function parseFromSource(src: string) {
	let parseTree: any = parseToTree(src);
	// console.log(JSON.stringify(parseTree, null, 4));

	// For simple expressions (fragments), we want to assume that the caller wants the return value.
	// So if we detect that structure, we'll unroll this a bit.
	if (parseTree.type === "Program" && parseTree.body.length === 1 && parseTree.body[0].type === "ExpressionStatement")
		parseTree = parseTree.body[0];

	return parse(parseTree);
}
