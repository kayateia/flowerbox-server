/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

export class WobReferenceException {
	constructor(cause: string, id: number) {
		this.cause = cause;
		this.id = id;
	}

	public cause: string;
	public id: number;
}

export class WobOperationException {
	constructor(cause: string, ids: number[]) {
		this.cause = cause;
		this.ids = ids;
	}

	public cause: string;
	public ids: number[];
}

export class LanguageParseException {
	constructor(cause: string, value: string) {
		this.cause = cause;
		this.value = value;
	}

	public cause: string;
	public value: string;
}
