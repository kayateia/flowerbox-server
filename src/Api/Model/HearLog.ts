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
	constructor(timestamp: number, type: string, tag: string, items: any[]) {
		this.timestamp = timestamp;
		this.type = type;
		this.tag = tag;
		this.items = items;
	}

	public timestamp: number;
	public type: string;
	public tag: string;
	public items: any[];

	// These are possible values for the "type" member.
	public static TypeOutput = "output";
	public static TypeCommand = "command";
}

// Rich text with a wob reference.
export class WobRef {
	constructor(text: string, id: number) {
		this.rich = "wob";
		this.text = text;
		this.id = id;
	}

	public rich: string;
	public text: string;
	public id: number;
}
