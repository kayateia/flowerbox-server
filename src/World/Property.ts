/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import * as Persistence from "../Utils/Persistence";

// A property on a Wob; this covers both its value and its permission bits.
export class Property {
	constructor(value: any, perms: number) {
		this.value = value;
		this.perms = perms;
	}

	// Permission bits (r/w).
	public perms: number;

	// The value of the property.
	public value: any;
}

// When we need to reference a property, one of these should be used.
export class PropertyRef {
	constructor(wobid: number, property: string) {
		this.wobid = wobid;
		this.property = property;
	}

	public persist(): any {
		return { wobid: this.wobid, property: this.property };
	}

	public static Unpersist(obj: any): PropertyRef {
		return new PropertyRef(obj.wobid, obj.property);
	}

	public wobid: number;
	public property: string;
}
Persistence.registerType(PropertyRef);
