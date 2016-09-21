/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { ModelBase } from "./ModelBase";

// For returning one property on a wob.
export class Property extends ModelBase {
	constructor(id: number, name: string, value: any, perms: string, permsEffective: string, sub?: string) {
		super(true);
		this.id = id;
		this.name = name;
		this.value = value;
		this.perms = perms;
		this.permseffective = permsEffective;
		this.sub = sub;
	}

	public id: number;
	public name: string;
	public value: any;
	public perms: string;
	public permseffective: string;
	public sub: string;
	public computed: boolean;
}

// For returning one verb on a wob.
export class Verb extends ModelBase {
	constructor(id: number, name: string, sigs: string[], code: string, perms: string, permsEffective: string) {
		super(true);
		this.id = id;
		this.name = name;
		this.sigs = sigs;
		this.code = code;
		this.perms = perms;
		this.permseffective = permsEffective;
	}

	public id: number;
	public name: string;
	public sigs: string[];
	public code: string;
	public perms: string;
	public permseffective: string;
}

// Expected object to be passed in per verb being set.
export class VerbSet {
	public sigs: string[];
	public code: string;
}

// Returned from setting multiple verbs. Since verbs may have compilation errors,
// we have to return info about what happened.
export class VerbSetErrors extends ModelBase {
	constructor(errors: any) {
		super(errors === undefined);
		this.verbErrors = errors;
	}

	// This will be an object of verb-word to error.
	public verbErrors: any;
}

// For returning the basic info about a wob.
export class Info extends ModelBase {
	constructor(id: number, base: number, container: number,
			name: string, desc: string, globalid: string,
			owner: number, group: number, perms: string,
			properties?: AttachedProperty[], verbs?: AttachedItem[]) {
		super(true);

		this.id = id;
		this.base = base;
		this.container = container;

		this.name = name;
		this.desc = desc;
		this.globalid = globalid;
		this.owner = owner;
		this.group = group;
		this.perms = perms;

		this.properties = properties;
		this.verbs = verbs;
	}

	// Intrinsic properties
	public id: number;
	public base: number;
	public container: number;
	public owner: number;
	public group: number;
	public perms: string;

	// Common named properties
	public name: string;
	public desc: string;
	public globalid: string;

	// List of properties and verbs, by wob ID.
	public properties: AttachedProperty[];
	public verbs: AttachedVerb[];
}

export class AttachedItem {
	constructor(sourceid: number, value: string, perms: string, permsEffective: string) {
		this.sourceid = sourceid;
		this.value = value;
		this.perms = perms;
		this.permseffective = permsEffective;
	}

	public sourceid: number;
	public value: string;
	public perms: string;
	public permseffective: string;
}

export class AttachedProperty extends AttachedItem {
	constructor(sourceid: number, value: string, perms: string, permsEffective: string, blobmimetype: string) {
		super(sourceid, value, perms, permsEffective);
		this.blobmimetype = blobmimetype;
	}

	public blobmimetype: string;
}

export class AttachedVerb extends AttachedItem {
	constructor(sourceid: number, value: string, perms: string, permsEffective: string) {
		super(sourceid, value, perms, permsEffective);
	}
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

export class InstanceOfResult {
	constructor(id: number, isInstance: boolean) {
		this.id = id;
		this.isInstance = isInstance;
	}

	public id: number;
	public isInstance: boolean;
}

export class InstanceOfList extends ModelBase {
	constructor(list: InstanceOfResult[]) {
		super(true);
		this.list = list;
	}

	public list: InstanceOfResult[];
}

// Model for setting permissions on a wob, property, or verb.
// The value here is "any" because it could be a numeric property value or a
// diff string ("u+rw").
export class PermsSet {
	constructor(perms: any) {
		this.perms = perms;
	}

	public perms: any;
}

// Returned by the permission getters and setters to describe permissions on an item.
export class PermsStatus {
	constructor(perms: string, permsEffective: string) {
		this.perms = perms;
		this.permsEffective = permsEffective;
	}

	public perms: string;
	public permsEffective: string;
}
