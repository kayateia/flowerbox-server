/*
	Flowerbox
	Copyright (C) 2016 Dove
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

export class ModelBase {
	constructor(success: boolean, errorMessage?: string) {
		this.success = success;
		this.error = errorMessage;
	}

	public success: boolean;
	public error: string;
}
