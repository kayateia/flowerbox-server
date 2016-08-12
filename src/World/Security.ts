/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

/*

Flowerbox permissions are broken into 3 different segments:
- Owner permissions
- Group permissions
- Other permissions

Owner permissions are easy: owners always have full permissions to everything, except
potentially with properties with a sticky bit.

Group permissions are the permissions that apply when the acting user is a member
of the group hierarchy specified in the group field of the wob. This is not implemented yet.

Other permissions are for everyone else: If you are neither the owner nor in the group,
this is what you will get.

For each object that is securable, these three groups are separated by 8 bits within a
single 24-bit number, from most to least significant. So for example, a property that is
read/write for the owner, readable for group, and not readable by others, might have a
textual representation like "-rw- -r-- ----". This would be represented in numeric
form as 0x060400.

*/

import { Wob, WobProperties } from "./Wob";

export class Perms {
	// Sticky
	// Properties: This property will retain ownership and permissions from the
	//   object on which it originated.
	public static s = 0x08;

	// Read
	// Properties: Can read the property value
	// Wobs: Can read the property list, the verb program, and the base property
	public static r = 0x04;

	// Write
	// Properties: Can write the property value
	// Wobs: Can create and delete properties, change base property
	public static w = 0x02;

	// Execute
	// Verbs: Can execute the verb (this is set per verb in the verb code)
	public static x = 0x01;

	// Gets or sets the group portion of a permissions mask.
	public static group(mask: number, newValue?: number): number {
		if (newValue !== undefined && newValue !== null)
			return (mask & ~0xff00) | ((newValue & 0xff) << 8);
		else
			return (mask >> 8) & 0xff;
	}

	// Gets or sets the others portion of a permissions mask.
	public static others(mask: number, newValue?: number): number {
		if (newValue !== undefined && newValue !== null)
			return (mask & ~0xff) | (newValue & 0xff);
		else
			return mask & 0xff;
	}
}

// Static methods for verifying various security actions against the permissions on a wob.
export class Security {
	public static CheckWob(wob: Wob, user: Wob, mask: number): boolean {
		// We ignore group for now.
		let owner = wob.getProperty(WobProperties.Owner);
		if (!owner)
			return false;

		if (owner.value === user.id)
			return true;

		let perms = wob.getProperty(WobProperties.PermBits);
		if (!perms)
			return false;

		let others = Perms.others(perms.value);
		if (others & mask)
			return true;

		return false;
	}

	public static CheckWobRead(wob: Wob, user: Wob): boolean {
		return Security.CheckWob(wob, user, Perms.r);
	}

	public static CheckWobWrite(wob: Wob, user: Wob): boolean {
		return Security.CheckWob(wob, user, Perms.w);
	}

	public static async CheckProperty(wob: Wob, property: string, user: Wob, mask: number): Promise<boolean> {
		// We ignore group for now.
		let owner = wob.getProperty(WobProperties.Owner);
		if (!owner)
			return false;

		if (owner.value === user.id)
			return true;

		let prop = wob.getProperty(property);

		// FIXME: Unfinished

		return true;
	}
}
