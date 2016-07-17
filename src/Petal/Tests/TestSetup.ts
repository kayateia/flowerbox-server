/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import * as Petal from "../Petal";

export class TestSetup {
	constructor(program: string, verbose?: boolean) {
		this.runtime = new Petal.Runtime(verbose);
		this.output = "";
		this.runtime.currentScope().set("log", this.getLogger());
		this.programParsed = Petal.parseFromSource(program);
	}

	public getLogger() {
		let that = this;
		return function() {
			let args = [];
			for (let i=0; i<arguments.length; ++i) {
				if (arguments[i] === undefined || arguments[i] === null)
					args.push("undefined");
				else if (typeof(arguments[i]) === "object")
					args.push(JSON.stringify(arguments[i]));
				else if (typeof(arguments[i]) === "function")
					args.push("<function>");
				else
					args.push(arguments[i]);
			}
			that.output += args.join(" ") + "\n";
		};
	}

	public runProgram() {
		this.runtime.pushAction(Petal.Step.Node("Main program", this.programParsed));
		this.runtime.execute(1000);
	}

	public async runProgramAsync() {
		this.runtime.pushAction(Petal.Step.Node("Main program", this.programParsed));
		await this.runtime.executeAsync(1000);
	}

	public runtime: Petal.Runtime;
	public output: string;
	public programParsed: Petal.AstNode;
}
