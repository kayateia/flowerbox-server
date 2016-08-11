/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { ModelBase } from "./ModelBase";

// For returning one property on a wob.
export class Property extends ModelBase {
	constructor(id: number, name: string, value: any) {
		super(true);
		this.id = id;
		this.name = name;
		this.value = value;
	}

	public id: number;
	public name: string;
	public value: any;
}

// For returning one verb on a wob.
export class Verb extends ModelBase {
	constructor(id: number, verb: string, sigs: string[], code: string) {
		super(true);
		this.id = id;
		this.verb = verb;
		this.sigs = sigs;
		this.code = code;
	}

	public id: number;
	public verb: string;
	public sigs: string[];
	public code: string;
}

// For returning the basic info about a wob.
export class Info extends ModelBase {
	constructor(id: number, base: number, container: number,
			name: string, desc: string, globalid: string,
			properties?: AttachedItem[], verbs?: AttachedItem[]) {
		super(true);

		this.id = id;
		this.base = base;
		this.container = container;

		this.name = name;
		this.desc = desc;
		this.globalid = globalid;

		this.properties = properties;
		this.verbs = verbs;
	}

	// Intrinsic properties
	public id: number;
	public base: number;
	public container: number;

	// Common named properties
	public name: string;
	public desc: string;
	public globalid: string;

	// List of properties and verbs, by wob ID.
	public properties: AttachedItem[];
	public verbs: AttachedItem[];
}

export class AttachedItem {
	constructor(sourceid: number, value: string) {
		this.sourceid = sourceid;
		this.value = value;
	}

	public sourceid: number;
	public value: string;
}

export class IdList extends ModelBase {
	constructor(list: number[]) {
		super(true);

		this.list = list;
	}

	public list: number[];
}

export class InfoList extends ModelBase {
	constructor(list: Info[]) {
		super(true);
		this.list = list;
	}

	public list: Info[];
}
