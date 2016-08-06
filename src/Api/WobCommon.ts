/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import * as Wob from "./Model/Wob";
import * as World from "../World/All";

export class WobCommon {
	// Gets all the Wob.Info data for a loaded wob.
	public static async GetInfo(wob: World.Wob, world: World.World): Promise<Wob.Info> {
		let base = wob.base;
		let container = wob.container;

		let name = await wob.getPropertyI(World.WobProperties.Name, world);
		let desc = await wob.getPropertyI(World.WobProperties.Description, world);
		let globalid = wob.getProperty(World.WobProperties.GlobalId);

		let properties = await wob.getPropertyNamesI(world);
		let verbs = await wob.getVerbNamesI(world);

		let rv = new Wob.Info(wob.id, base, container, name.value, desc.value, globalid,
			properties.map(p => new Wob.AttachedItem(p.wob, p.value)),
			verbs.map(v => new Wob.AttachedItem(v.wob, v.value)));
		return rv;
	}
}
