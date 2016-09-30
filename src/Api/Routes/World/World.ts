/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { WorldRouterBase } from "./WorldRouterBase";
import { ModelBase } from "../../Model/ModelBase";
import * as World from "../../../World/All";
import { DefaultPerms } from "../../Model/World";

export class WorldRouter extends WorldRouterBase {
	constructor() {
		super();

		// Get default permissions for several items (wob, property, verb).
		this.router.get("/default-perms/:type", (rq,rs,n) => { this.getDefaultPerms(rq,rs,n); });
	}

	private getDefaultPerms(req, res, next): void {
		let type = req.params.type;

		let perm = "";
		switch (type) {
		case "wob":
			perm = World.Security.GetDefaultWobString();
			break;
		case "property":
			perm = World.Security.GetDefaultPropertyString();
			break;
		case "verb":
			perm = World.Security.GetDefaultVerbString();
			break;
		default:
			res.status(404).json(new ModelBase(false, "Unknown permission type"));
			return;
		}

		res.status(200).json(new DefaultPerms(perm));
	}
}

export let worldRouter = new WorldRouter();
