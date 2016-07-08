/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import * as Petal from "../Petal/Petal";
import { World } from "./World";
import { LanguageParseException } from "./Exceptions";

export class Verb {
	constructor(verb: string, text: string) {
		this._verb = verb;
		this.text = text;
	}

	public get verb(): string {
		return this._verb;
	}

	public get text(): string {
		return this._text;
	}

	public set text(v: string) {
		if (v.indexOf("\r") >= 0)
			v = v.replace("\r\n", "\n");
		this._compiled = Petal.compileFromSource(v);
		this.parseForSignatures(v);
		this._text = v;
	}

	public get signatures(): VerbSig[] {
		return this._signatures;
	}

	public get compiled(): Petal.AstNode {
		return this._compiled;
	}

	private parseForSignatures(text: string): void {
		let verbLines: string[] =
			text
			.split("\n")
			.filter(isVerbLine)
			.map((i) => i.substr(3).trim());

		let newSigs: VerbSig[] = [];
		verbLines.forEach((verbLine: string) => {
			let sig = new VerbSig(verbLine);
			newSigs.push(sig);
		});

		this._signatures = newSigs;
	}

	private _verb: string;
	private _text: string;
	private _compiled: Petal.AstNode;
	private _signatures: VerbSig[];
}

function isVerbLine(code: string): boolean {
	code = code.trim();
	return code.startsWith("//#");
}

export class VerbSig {
	constructor(line: string) {
		let pieces: string[] = line.split(/\s+/);
		this.verb = pieces[0];
		if (pieces[1])
			this.dobj = pieces[1];
		if (pieces[2])
			this.prep = pieces[2];
		if (pieces[3])
			this.indobj = pieces[3];
		if (pieces[4])
			this.prep2 = pieces[4];
		if (pieces[5])
			this.indobj2 = pieces[5];
	}

	public verb: string;
	public dobj: string;
	public prep: string;
	public indobj: string;
	public prep2: string;
	public indobj2: string;
}
