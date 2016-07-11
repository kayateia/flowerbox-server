/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import * as Petal from "../Petal/Petal";
import { World } from "./World";
import { LanguageParseException } from "./Exceptions";

export class VerbCode {
	constructor(sigs: string[], code: Petal.AstNode) {
		this.signatures = sigs;
		this.code = code;
	}

	public signatures: string[];
	public code: Petal.AstNode;
}

export class Verb {
	constructor(verb: string, code: VerbCode) {
		this._verb = verb;
		this._code = code;
		this.parseForSignatures();
	}

	public get verb(): string {
		return this._verb;
	}

	public get signatures(): VerbSig[] {
		return this._signatures;
	}

	public get compiled(): Petal.AstNode {
		return this._code.code;
	}

	private parseForSignatures(): void {
		let newSigs: VerbSig[] = [];
		this._code.signatures.forEach((verbLine: string) => {
			let sig = new VerbSig(verbLine);
			newSigs.push(sig);
		});

		this._signatures = newSigs;
	}

	private _verb: string;
	private _code: VerbCode;
	private _signatures: VerbSig[];
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
