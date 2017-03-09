/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import * as Wob from "./Model/Wob";
import * as World from "../World/All";
import * as Petal from "../Petal/All";

export class WobCommon {
	// Gets all the Wob.Info data for a loaded wob.
	public static async GetInfo(wob: World.Wob, player: World.Wob, isAdmin: boolean, world: World.World): Promise<Wob.Info> {
		let base = wob.base;
		let container = wob.container;

		// Pull out some common intrinsics and regular properties.
		let name = await wob.getPropertyI(World.WobProperties.Name, world);
		let desc = await wob.getPropertyI(World.WobProperties.Description, world);
		let globalid = wob.getProperty(World.WobProperties.GlobalId);
		let owner = wob.owner;
		let group = wob.group;
		let perms = World.Perms.unparse(wob.perms);

		// Get all the properties and verbs. We need more than just their names here, as we
		// want to include useful metadata like permissions and mime types.
		let properties = await wob.getPropertiesI(world);
		let verbs = await wob.getVerbsI(world);

		// Convert the properties into property metadata.
		let propertyInfos: Wob.AttachedProperty[] = [];
		for (let p of properties.pairs()) {
			let key: string = p[0];
			let wobid: number = p[1].wob;
			let value: World.Property = p[1].value;

			// We don't want computed properties here. Those will get listed as verbs.
			if (value.value instanceof World.Verb)
				continue;

			// We only pass back a mime type if it's a blob property.
			let mimetype: string;
			if (value.value instanceof Petal.PetalBlob)
				mimetype = (<Petal.PetalBlob>(value.value)).mime;

			// If the property doesn't have permissions set, we use the defaults.
			let perms: string = World.Perms.unparse(value.perms);
			let permsEffective: string = perms;
			if (perms === undefined)
				permsEffective = World.Perms.unparse(World.Security.GetDefaultPropertyPerms());

			let ownerEffective: number = await WobCommon.GetPropertyOwner(key, wobid, value, world);

			propertyInfos.push(new Wob.AttachedProperty(wobid, key, perms, permsEffective, ownerEffective, mimetype));
		}

		// Convert the verbs into verb metadata.
		let verbInfos: Wob.AttachedVerb[] = [];
		for (let v of verbs) {
			// If the verb doesn't have permissions set, we use the defaults.
			let perms: string = World.Perms.unparse(v.value.perms);
			let permsEffective: string = perms;
			if (perms === undefined)
				permsEffective = World.Perms.unparse(World.Security.GetDefaultVerbPerms());

			let ownerEffective: number = await WobCommon.GetVerbOwner(v.wob, v.value, world);

			verbInfos.push(new Wob.AttachedVerb(v.wob, v.value.word, perms, permsEffective, ownerEffective));
		}

		// Compute these, as they may be computed properties.
		async function compute(prop: World.Property): Promise<any> {
			if (prop.value instanceof World.Verb) {
				// Execute the verb code to get the property value.
				let result = await World.executeFunction(null, player, isAdmin, world, prop.value.address, wob);
			 	return result.returnValue;
			} else {
				return prop.value;
			}
		}
		let nameValue = await compute(name.value);
		let descValue = await compute(desc.value);

		let rv = new Wob.Info(wob.id, base, container, nameValue, descValue,
			globalid ? globalid.value : null,
			owner,
			group,
			perms,
			propertyInfos,
			verbInfos);
		return rv;
	}

	// Given a property/wob combo, determine the actual owner of the property and return it.
	public static async GetPropertyOwner(propName: string, propWobId: number, prop: World.Property,
			world: World.World): Promise<number> {
		// Check to see if it's got a sticky ancestor. If so, we will set a different effective owner.
		let propWob: World.Wob = await world.getWob(propWobId);
		let ownerEffective: number = propWob.owner;
		let stickyOwner: World.Wob = await World.Actions.GetStickyParent(propWob, propName, world);
		if (stickyOwner)
			ownerEffective = stickyOwner.owner;

		return ownerEffective;
	}

	public static async GetVerbOwner(verbWobId: number, verb: World.Verb, world: World.World): Promise<number> {
		// For now, verbs are always owned by the owner of the wob they appear on.
		let verbWob: World.Wob = await world.getWob(verbWobId);
		let ownerEffective: number = verbWob.owner;
		return ownerEffective;
	}
}
