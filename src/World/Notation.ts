/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import * as Persistence from "./Persistence";

// A text annotation that can accompany user output to provide rich information about
// what the text contained within means.
export class Notation {
	constructor(text: string, value: any) {
		this.text = text;
		this.value = value;
	}

	public persist(): any {
		return { text: this.text, value: Persistence.persist(this.value) };
	}

	public static Unpersist(obj: any): Notation {
		return new Notation(obj.text, Persistence.unpersist(obj.value));
	}

	public text: string;
	public value: any;
}
