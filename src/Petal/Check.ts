/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstStatements } from "./AstStatements";
import { AstVarDecl } from "./AstVarDecl";
import { AstVarStatement } from "./AstVarStatement";
import { AstObject } from "./AstObject";
import { AstFunction } from "./AstFunction";

export class Check {
	// Returns true if the AST represents a single variable definition with an object value.
	public static IsSingleObjectDef(obj: AstNode): boolean {
		if (!(obj instanceof AstStatements))
			return false;

		let stmts: AstStatements = <AstStatements>obj;
		if (stmts.body.length !== 1)
			return false;

		if (!(stmts.body[0] instanceof AstVarStatement))
			return false;

		let varstmt: AstVarStatement = <AstVarStatement>stmts.body[0];
		if (varstmt.decls.length !== 1)
			return false;

		let vardecl: AstVarDecl = varstmt.decls[0];
		if (vardecl.init instanceof AstObject)
			return true;
		else
			return false;
	}

	// Returns true if the AST represents a single function definition.
	public static IsSingleFunctionDef(obj: AstNode): boolean {
		if (!(obj instanceof AstStatements))
			return false;

		let stmts: AstStatements = <AstStatements>obj;
		if (stmts.body.length !== 1)
			return false;

		if (!(stmts.body[0] instanceof AstFunction))
			return false;

		return true;
	}
}
