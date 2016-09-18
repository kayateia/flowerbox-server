/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import * as Petal from "../Petal/All";
import { World } from "./World";
import { LanguageParseException } from "./Exceptions";

// Code for a single verb; note that more than one VerbCode might share a single parsed/address.
export class VerbCode {
	constructor(sigs: string[], code: string, parsed: Petal.AstNode, address: Petal.Address) {
		this.signatures = sigs;
		this.code = code;
		this.parsed = parsed;
		this.address = address;
	}

	public signatures: string[];
	public code: string;
	public parsed: Petal.AstNode;
	public address: Petal.Address;
}

// This class is used to store a set of verbforms directly on Wob.
export class Verb {
	constructor(word: string, code: VerbCode, perms?: number) {
		this._word = word;
		this._code = code;
		this._signatures = code.signatures.map(s => new VerbSig(s));
		this._perms = perms;
	}

	public get word(): string {
		return this._word;
	}

	public get signatures(): VerbSig[] {
		return this._signatures;
	}

	public get signatureStrings(): string[] {
		return this._code.signatures;
	}

	public get code(): string {
		return this._code.code;
	}

	public get parsed(): Petal.AstNode {
		return this._code.parsed;
	}

	public get address(): Petal.Address {
		return this._code.address;
	}

	public get perms(): number {
		return this._perms;
	}

	public set perms(p: number) {
		this._perms = p;
	}

	private _word: string;
	private _code: VerbCode;
	private _signatures: VerbSig[];
	private _perms: number;
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

// This is what you'll get back by requesting inhertance-powered verbs from a Wob.
//
export class VerbComposite {
	constructor(word: string, forms: Verb[]) {
		this._word = word;
		this._forms = forms;
	}

	public get word(): string {
		return this._word;
	}

	public get forms(): Verb[] {
		return this._forms;
	}

	private _word: string;
	private _forms: Verb[];
}
