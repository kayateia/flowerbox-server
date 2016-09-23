/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { ParseResult } from "../InputParser";
import { Wob } from "../Wob";
import { World } from "../World";
import { WobWrapper } from "./WobWrapper";

// Wraps the ParseResult object for $parse inside Petal.
export class DollarParse {
	constructor(parse: ParseResult, player: Wob, world: World, injections: any) {
		this.verbName = parse.verbName;
		if (parse.verbObject)
			this.verbObject = new WobWrapper(parse.verbObject.id);
		if (parse.direct) {
			this.direct = new WobWrapper(parse.direct.id);
			this.directWords = parse.directWords;
		}
		this.prep = parse.prep;
		if (parse.indirect) {
			this.indirect = new WobWrapper(parse.indirect.id);
			this.indirectWords = parse.indirectWords;
		}
		this.prep2 = parse.prep2;
		if (parse.indirect2) {
			this.indirect2 = new WobWrapper(parse.indirect2.id);
			this.indirect2Words = parse.indirect2Words;
		}

		this.player = new WobWrapper(player.id);

		this.text = parse.text;
	}

	public static Members: string[] = [
		"verbName", "verbObject",
		"direct", "directWords", "prep",
		"indirect", "indirectWords", "prep2",
		"indirect2", "indirect2Words",
		"player", "text"
	];

	public verbName: string;
	public verbObject: WobWrapper;
	// public verb: Verb;

	public direct: WobWrapper;
	public directWords: string;
	public prep: string;
	public indirect: WobWrapper;
	public indirectWords: string;
	public prep2: string;
	public indirect2: WobWrapper;
	public indirect2Words: string;

	public player: WobWrapper;

	public text: string;
}
