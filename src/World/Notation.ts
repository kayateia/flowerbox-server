/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

// A text annotation that can accompany user output to provide rich information about
// what the text contained within means.
export class Notation {
	constructor(text: string, value: any) {
		this.text = text;
		this.value = value;
	}

	public text: string;
	public value: any;
}
