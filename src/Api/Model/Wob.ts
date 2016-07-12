/*
	Flowerbox
	Copyright (C) 2016 Dove
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { ModelBase } from "./ModelBase";

export class Property extends ModelBase {
	constructor(id: number, property: string, value: any) {
		super(true);
		this.id = id;
		this.property = property;
		this.value = value;
	}

	public id: number;
	public property: string;
	public value: any;
}
