/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { ModelBase } from "./ModelBase";

// For returning default permissions.
export class DefaultPerms extends ModelBase {
	constructor(perms: string) {
		super(true);
		this.perms = perms;
	}

	public perms: string;
}
