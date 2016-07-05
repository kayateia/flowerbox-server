/*
	Flowerbox
	Copyright (C) 2016 Dove
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { ParseResult } from "./InputParser";
import { Wob } from "./Wob";
import { World } from "./World";
import * as Petal from "../Petal/Petal";
import * as Strings from "../Strings";
import { WobOperationException } from "./Exceptions";

// Wraps a Wob for use within Petal.
class WobWrapper implements Petal.IObject {
	constructor(wob: Wob) {
		this._wob = wob;
	}

	public getAccessor(index: any): Petal.LValue {
		if (typeof(index) !== "string")
			throw new WobOperationException("Can't access non-string members on Wobs", []);

		let member: string = index;
		let props: string[] = this._wob.getPropertyNames();
		let verbs: string[] = this._wob.getVerbNames();

		if (Strings.caseIn(member, props)) {
			return new Petal.LValue("Wob." + member, (runtime: Petal.Runtime) => {
				return this._wob.getProperty(member);
			}, (runtime: Petal.Runtime, value: any) => {
				this._wob.setProperty(member, value);
			});
		} else if (Strings.caseIn(member, verbs)) {
			return new Petal.LValue("Wob." + member, (runtime: Petal.Runtime) => {
				return () => {
					// Eventually, we'll want to call down into the other verb and pass parameters and such.
				};
			}, (runtime: Petal.Runtime, value: any) => {
				throw new WobOperationException("Can't set new verbs right now", []);
			});
		} else {
		}
	}

	private _wob: Wob;
}

// Represents the $ object within the game, which represents the interface to the game itself.
class DollarObject {
	public log(): void {
		let args = [];
		for (let i=0; i<arguments.length; ++i)
			args.push(arguments[i]);
		console.log("LOG OUTPUT:", ...args);
	}
}

// Wraps the ParseResult object for $env inside Petal.
class DollarEnv {
	constructor(parse: ParseResult, caller: Wob) {
		this.verbName = parse.verbName;
		this.verbObject = new WobWrapper(parse.verbObject);
		if (parse.direct)
			this.direct = new WobWrapper(parse.direct);
		this.prep = parse.prep;
		if (parse.indirect)
			this.indirect = new WobWrapper(parse.indirect);
		this.prep2 = parse.prep2;
		if (parse.indirect2)
			this.indirect2 = new WobWrapper(parse.indirect2);

		this.caller = new WobWrapper(caller);
	}

	public static Members: string[] = [
		"verbName", "verbObject", "direct", "prep", "indirect", "prep2", "indirect2", "caller"
	];

	public verbName: string;
	public verbObject: WobWrapper;
	// public verb: Verb;

	public direct: WobWrapper;
	public prep: string;
	public indirect: WobWrapper;
	public prep2: string;
	public indirect2: WobWrapper;

	public caller: WobWrapper;
}

export async function executeResult(parse: ParseResult, player: Wob, world: World): Promise<void> {
	let dollar = Petal.ObjectWrapper.WrapGeneric(new DollarObject(), ["log"], false);
	let dollarEnv = Petal.ObjectWrapper.WrapGeneric(new DollarEnv(parse, player), DollarEnv.Members, false);

	// Set up a runtime. We'll install our runtime values from above, then call the verb code.
	// The verb code should create a function named after the verb.
	let rt = new Petal.Runtime();
	let scope = rt.currentScope();
	scope.set("$", dollar);
	scope.set("$env", dollarEnv);
	rt.pushAction(Petal.Step.Node("Parse verb program", parse.verb.compiled));
	rt.execute(10000);

	// Now we need to create a request to call the function.
	let call = Petal.AstCallExpression.Create(scope.get("verb_" + parse.verbName), []);
	rt.pushAction(Petal.Step.Node("Call verb program", call));
	rt.execute(10000);
}
