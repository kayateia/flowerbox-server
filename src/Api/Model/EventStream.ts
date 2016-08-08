/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { ModelBase } from "./ModelBase";

export class EventStream extends ModelBase {
	constructor(log: EventStreamItem[]) {
		super(true);
		this.log = log;
	}

	public log: EventStreamItem[];
}

export class EventStreamItem {
	constructor(timestamp: number, type: string, tag: string, items: any[]) {
		this.timestamp = timestamp;
		this.type = type;
		this.tag = tag;
		this.items = items;
	}

	public timestamp: number;
	public type: string;		// Comes from World/Wob.ts/EventType
	public tag: string;
	public items: any[];
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

// Rich image with a wob property reference.
export class ImageRef {
	constructor(id: number, property: string, altText: string) {
		this.id = id;
		this.property = property;
		this.text = altText;
		this.rich = "image";
	}

	public rich: string;
	public text: string;
	public id: number;
	public property: string;
}
