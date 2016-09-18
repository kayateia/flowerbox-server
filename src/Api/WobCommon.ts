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
	public static async GetInfo(wob: World.Wob, world: World.World): Promise<Wob.Info> {
		let base = wob.base;
		let container = wob.container;

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

			// We only pass back a mime type if it's a blob property.
			let mimetype: string;
			if (value.value instanceof Petal.PetalBlob)
				mimetype = (<Petal.PetalBlob>(value.value)).mime;

			// If the property doesn't have permissions set, we use the defaults.
			let perms: string = World.Perms.unparse(value.perms);
			let permsEffective: string = perms;
			if (perms === undefined)
				permsEffective = World.Perms.unparse(World.Security.GetDefaultPropertyPerms());

			propertyInfos.push(new Wob.AttachedProperty(wobid, key, perms, permsEffective, mimetype));
		}

		// Convert the verbs into verb metadata.
		let verbInfos: Wob.AttachedVerb[] = [];
		for (let v of verbs) {
			// If the verb doesn't have permissions set, we use the defaults.
			let perms: string = World.Perms.unparse(v.value.perms);
			let permsEffective: string = perms;
			if (perms === undefined)
				permsEffective = World.Perms.unparse(World.Security.GetDefaultVerbPerms());

			verbInfos.push(new Wob.AttachedVerb(v.wob, v.value.word, perms, permsEffective));
		}

		let rv = new Wob.Info(wob.id, base, container, name.value.value, desc.value.value,
			globalid ? globalid.value : null,
			owner,
			group,
			perms,
			propertyInfos,
			verbInfos);
		return rv;
	}
}
