/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { RouterBase } from "../RouterBase";
import * as World from "../../../World/All";
import { ModelBase } from "../../Model/ModelBase";

export class WorldRouterBase extends RouterBase {
	constructor() {
		super();
	}

	// This attempts to locate a wob contextually, by a global ID, integer, or partial
	// name of something in the room with the player. This works off the same rules
	// as InputParser, it just adds raw number support.
	protected async getWob(id: string, res): Promise<World.Wob> {
		let wob: World.Wob;

		let num = parseInt(id, 10);
		if (!Number.isNaN(num)) {
			wob = await this.world.getWob(num);
			if (!wob) {
				res.status(404).json(new ModelBase(false, "Unknown wob ID"));
				return null;
			}
		} else {
			let player = await this.world.getWob(this.token.wobId);
			wob = await World.Actions.Lookup(this.world, player, id);
			if (wob === World.Wob.None) {
				res.status(404).json(new ModelBase(false, "Unknown wob ID"));
				return null;
			} else if (wob === World.Wob.Ambiguous) {
				res.status(404).json(new ModelBase(false, "Ambiguous wob prefix"));
				return null;
			}
		}

		return wob;
	}

	// Does some preliminary checks for reading on objects on a wob. Returns one of three things:
	// - A Wob representing the source object where the property or verb came from
	// - Null, if the object doesn't exist
	// - True, if the entire check should just succeed immediately
	protected async readChecks(srcWobId: number, furtherChecks: (srcWob: World.Wob) => boolean, res: any): Promise<any> {
		if (this.token.admin)
			return true;

		let srcWob = await this.world.getWob(srcWobId);
		if (!srcWob) {
			res.status(500).json(new ModelBase(false, "Can't find property's wob to test security"));
			return false;
		}

		return furtherChecks(srcWob);
	}
}
