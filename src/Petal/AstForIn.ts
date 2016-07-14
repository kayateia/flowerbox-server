/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { AstNode } from "./AstNode";
import { AstObject } from "./AstObject";
import { compile } from "./Parser";
import { Step, Runtime } from "./Runtime";
import { StandardScope } from "./Scopes/StandardScope";
import { Value } from "./Value";
import { Utils } from "./Utils";
import { RuntimeException } from "./Exceptions";

export class AstForIn extends AstNode {
	constructor(parseTree: any) {
		super(parseTree);

		// We're just going to cheat on this one because the structure is always the same,
		// and this is much simpler for us.
		this.varName = parseTree.left.declarations[0].id.name;
		this.source = compile(parseTree.right);
		this.body = compile(parseTree.body);
	}

	public execute(runtime: Runtime): void {
		// Stack marker in case we want to break or continue.
		runtime.pushAction(Step.Nonce("ForIn marker"));

		// Push on a scope to handle what drops out of the init vars.
		runtime.pushAction(Step.Scope("For init scope", new StandardScope(runtime.currentScope())));

		runtime.pushAction(Step.Callback("ForIn outer", () => {
			// Get the value from the init.
			let source = Value.PopAndDeref(runtime);

			// For arrays, we just enumerate the contents. For objects, we enumerate their keys.
			// For everything else, there's M... exceptions. For now non-Petal objects are
			// also included in that last one.
			if (!(source instanceof Array)) {
				if (typeof(source) !== "object")
					throw new RuntimeException("Can't enumerate object", source);
				if (!AstObject.IsPetalObject(source))
					throw new RuntimeException("Can't enumerate object", source);

				source = Utils.GetPropertyNames(source)
					.filter(x => !x.startsWith("___"));
			}

			let that = this;
			(function nextIteration() {
				if (!source.length)
					return;

				// Peel off the first item in the list.
				let item = source.shift();

				// Set its value in the scope.
				runtime.currentScope().set(that.varName, item);

				// And push on the body for one iteration.
				runtime.pushAction(Step.Callback("ForIn next iteration", nextIteration));
				runtime.pushAction(Step.Node("ForIn body", that.body));
			})();
		}));

		// First thing, execute the source and get that value for traversal.
		runtime.pushAction(Step.Node("ForIn init", this.source));
	}

	public what: string = "ForIn";
	public varName: string;
	public source: AstNode;
	public body: AstNode;
}
