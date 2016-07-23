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
		this.runtime.currentScope.set("log", Petal.Address.Function(this.getLogger()));
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
		this.compile();
		this.runtime.setInitialPC(new Petal.Address(0, this.module, this.programParsed));
		this.runtime.execute();
	}

	public async runProgramAsync() {
		this.compile();
		this.runtime.setInitialPC(new Petal.Address(0, this.module, this.programParsed));
		await this.runtime.executeAsync(1000);
	}

	public compile() {
		let compiler = new Petal.Compiler();
		compiler.compile(this.programParsed);
		this.module = compiler.module;
	}

	public runtime: Petal.Runtime;
	public module: Petal.Module;
	public output: string;
	public programParsed: Petal.AstNode;
}
