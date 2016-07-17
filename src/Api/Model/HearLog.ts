/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { ModelBase } from "./ModelBase";

export class HearLog extends ModelBase {
	constructor(log: HearLogItem[]) {
		super(true);
		this.log = log;
	}

	public log: HearLogItem[];
}

export class HearLogItem {
	constructor(timestamp: number, items: any[]) {
		this.timestamp = timestamp;
		this.items = items;
	}

	public timestamp: number;
	public items: any[];
}

// Rich text with a wob reference.
export class WobRef {
	constructor(text: string, id: number) {
		this.text = text;
		this.id = id;
	}

	public text: string;
	public id: number;
}
