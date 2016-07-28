/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

// Base class for exceptions that captures the stack.
export class Exception extends Error {
	constructor() {
		super();
	}
}
