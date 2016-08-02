/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { Exception } from "../Exception";

export class WobReferenceException extends Exception {
	constructor(cause: string, id: number) {
		super();
		this.cause = cause;
		this.id = id;
	}

	public cause: string;
	public id: number;
}

export class WobOperationException extends Exception {
	constructor(cause: string, ids: number[]) {
		super();
		this.cause = cause;
		this.ids = ids;
	}

	public cause: string;
	public ids: number[];
}

export class InvalidCodeException extends Exception {
	constructor(cause: string, text: string) {
		super();
		this.cause = cause;
		this.text = text;
	}

	public cause: string;
	public text: string;
}

export class LanguageParseException extends Exception {
	constructor(cause: string, value: string) {
		super();
		this.cause = cause;
		this.value = value;
	}

	public cause: string;
	public value: string;
}

export class DuplicationException extends Exception {
	constructor(cause: string, value: string) {
		super();
		this.cause = cause;
		this.value = value;
	}

	public cause: string;
	public value: string;
}

export class DatabaseException extends Exception {
	constructor(cause: string, value: any) {
		super();
		this.cause = cause;
		this.value = value;
	}

	public cause: string;
	public value: any;
}
