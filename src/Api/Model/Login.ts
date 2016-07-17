/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { ModelBase } from "./ModelBase";

export class LoginResult extends ModelBase {
	constructor(token: string) {
		super(true);
		this.token = token;
	}

	public token: string;
}
