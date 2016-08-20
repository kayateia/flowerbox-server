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

// Note that the static members of this class are lower case to match Petal conventions,
// because these will be exported directly to Petal.
export class Perms {
	// Sticky / Super
	// Properties: This property will retain ownership and permissions from the
	//   object on which it originated. This bit is set on the "misc" part.
	// Verbs: This verb, when executed, will run with elevated (admin) privileges.
	//   This permission is not transitive, so any code called from the admin verb
	//   will not have elevated privileges (unless that verb is also +s).
	public static s = 0x08;

	// Read
	// Properties: Can read the property value
	// Verbs: Can read the verb program
	// Wobs: Can read the property list and the base property
	public static r = 0x04;

	// Write
	// Properties: Can write the property value
	// Verbs: Can write the verb program
	// Wobs: Can create and delete properties and verbs, change base property
	public static w = 0x02;

	// Execute
	// Verbs: Can execute the verb
	public static x = 0x01;

	private static GetSetBits(mask: number, bits: number, newValue?: number): number {
		if (newValue !== undefined && newValue !== null)
			return (mask & ~(0xff << bits)) | ((newValue & 0xff) << bits);
		else
			return (mask >> bits) & 0xff;
	}

	// Gets or sets the misc portion of a permissions mask.
	public static misc(mask: number, newValue?: number): number {
		return Perms.GetSetBits(mask, 24, newValue);
	}

	// Gets or sets the owner portion of a permissions mask.
	// Note that this is not used in practice, but it's here for completion's sake.
	public static owner(mask: number, newValue?: number): number {
		return Perms.GetSetBits(mask, 16, newValue);
	}

	// Gets or sets the group portion of a permissions mask.
	public static group(mask: number, newValue?: number): number {
		return Perms.GetSetBits(mask, 8, newValue);
	}

	// Gets or sets the others portion of a permissions mask.
	public static others(mask: number, newValue?: number): number {
		return Perms.GetSetBits(mask, 0, newValue);
	}

	// This expects a string of the form "srwxr--r--" and returns permissions bit values.
	public static parse(maskString: string): number {
		let out = 0;
		if (maskString[0] === "s") {
			out = Perms.misc(out, Perms.s);
			maskString = maskString.substr(1);
		}

		function parseOneChunk(chunk: string): number {
			let chunkOut = 0;
			if (chunk[0] === "r")
				chunkOut = Perms.r;
			if (chunk[1] === "w")
				chunkOut |= Perms.w;
			if (chunk[2] === "x")
				chunkOut |= Perms.x;
			return chunkOut;
		}

		out = Perms.owner(out, parseOneChunk(maskString.substr(0, 3)));
		out = Perms.group(out, parseOneChunk(maskString.substr(3, 3)));
		out = Perms.others(out, parseOneChunk(maskString.substr(6, 3)));

		return out;
	}
}

// Static methods for verifying various security actions against the permissions on a wob.
export class Security {
	// Checks if the specified user has all the specified permissions on a wob.
	public static CheckWob(wob: Wob, userId: number, mask: number): boolean {
		// We ignore group for now.
		let ownerId = wob.owner;
		if (!ownerId)
			return false;

		if (ownerId === userId)
			return true;

		let perms = wob.perms;
		let others = Perms.others(perms);
		if ((others & mask) === mask)
			return true;

		return false;
	}

	// Checks if the specified user has read permissions on a wob.
	public static CheckWobRead(wob: Wob, userId: number): boolean {
		return Security.CheckWob(wob, userId, Perms.r);
	}

	// Checks if the specified user has write permissions on a wob.
	public static CheckWobWrite(wob: Wob, userId: number): boolean {
		return Security.CheckWob(wob, userId, Perms.w);
	}

	// Checks if the specified user has all the specified permissions on a property on a wob.
	public static CheckProperty(wob: Wob, property: string, userId: number, mask: number): boolean {
		// We ignore group for now.
		let owner = wob.owner;
		if (!owner)
			return false;

		if (owner === userId)
			return true;

		let prop = wob.getProperty(property);
		if (!prop) {
			// FIXME: Some logic here about creating properties.
			return false;
		}

		let perms = prop.perms;
		if (!perms)
			perms = Perms.parse("rw-r--r--");
		let others = Perms.others(perms);
		if ((others & mask) === mask)
			return true;

		return false;
	}

	// Checks if the specified user has read permissions on a property on a wob.
	public static CheckPropertyRead(wob: Wob, property: string, userId: number): boolean {
		return Security.CheckProperty(wob, property, userId, Perms.r);
	}

	// Checks if the specified user has write permissions on a property on a wob.
	public static CheckPropertyWrite(wob: Wob, property: string, userId: number): boolean {
		return Security.CheckProperty(wob, property, userId, Perms.w);
	}

	// Returns true if the specified property has its stick bit set.
	public static CheckPropertySticky(wob: Wob, property: string): boolean {
		let prop = wob.getProperty(property);
		if (!prop)
			return false;

		let perms = prop.perms;
		if (!perms)
			return false;
		let misc = Perms.misc(perms);
		return !!(misc & Perms.s);
	}

	// Checks if the specified user has all the specified permissions on a verb on a wob.
	public static CheckVerb(wob: Wob, verbWord: string, userId: number, mask: number): boolean {
		// We ignore group for now.
		let owner = wob.owner;
		if (!owner)
			return false;

		if (owner === userId)
			return true;

		let verb = wob.getVerb(verbWord);
		if (!verb) {
			// FIXME: Some logic here about creating verbs.
			return false;
		}

		let perms = verb.perms;
		if (!perms)
			perms = Perms.parse("rwxr-xr-x");
		let others = Perms.others(perms);
		if (others & mask)
			return true;

		return false;
	}

	// Checks if the specified user has read permissions on a verb on a wob.
	public static CheckVerbRead(wob: Wob, verb: string, userId: number): boolean {
		return Security.CheckVerb(wob, verb, userId, Perms.r);
	}

	// Checks if the specified user has write permissions on a verb on a wob.
	public static CheckVerbWrite(wob: Wob, verb: string, userId: number): boolean {
		return Security.CheckVerb(wob, verb, userId, Perms.w);
	}

	// Checks if the specified user has execute permissions on a verb on a wob.
	public static CheckVerbExecute(wob: Wob, verb: string, userId: number): boolean {
		return Security.CheckVerb(wob, verb, userId, Perms.x);
	}

	// Returns true if the specified verb is intended to be run with elevated privileges.
	public static CheckVerbElevated(wob: Wob, verbWord: string): boolean {
		let verb = wob.getVerb(verbWord);
		if (!verb)
			return false;

		let perms = verb.perms;
		if (!perms)
			return false;
		let misc = Perms.misc(perms);
		return !!(misc & Perms.s);
	}


	/////////////////////////////////////////////////////////////////////////////////////////
	// The rest of these are basically convenience methods that call back to the ones above,
	// to centralize all the checks so we can easily change them later.

	// Checks if the specified user has the rights to get the list of properties on a wob.
	public static CheckGetWobProperties(wob: Wob, userId: number): boolean {
		return Security.CheckWobRead(wob, userId);
	}

	// Checks if the specified user has the rights to get the list of verbs on a wob.
	public static CheckGetWobVerbs(wob: Wob, userId: number): boolean {
		return Security.CheckWobRead(wob, userId);
	}

	// Checks if the specified user has the rights to add a property to a wob.
	public static CheckSetWobProperties(wob: Wob, userId: number): boolean {
		return Security.CheckWobWrite(wob, userId);
	}

	// Checks if the specified user has the rights to add a verb to a wob.
	public static CheckSetWobVerbs(wob: Wob, userId: number): boolean {
		return Security.CheckWobWrite(wob, userId);
	}
}
