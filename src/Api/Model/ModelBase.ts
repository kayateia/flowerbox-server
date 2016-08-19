/*
	Flowerbox
	Copyright (C) 2016 Dove
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

export class ModelBase {
	constructor(success: boolean, error?: any) {
		this.success = success;
		if (error instanceof Error) {
			let ei: Error = error;
			this.error = ei.message;
			this.errorStack = ei.stack;
		} else
			this.error = error;
	}

	public success: boolean;
	public error: string;
	public errorStack: string;
}
