/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import * as Petal from "../../Petal/All";
import { World } from "../World";
import { WobWrapper } from "./WobWrapper";

// Simple root scope which implements Flowerbox #n and @at lookups.
export class RootScope implements Petal.IScopeCatcher {
	constructor(world: World, injections: any) {
		this._world = world;
		this._injections = injections;
	}

	public async get(name: string): Promise<any> {
		if (!name)
			return null;
		if (name[0] === "#") {
			let num = parseInt(name.substr(1), 10);
			return new WobWrapper(num);
		} else if (name[0] === "@") {
			let at = name.substr(1);
			let results = await this._world.getWobsByGlobalId([at]);

			if (results.length === 0)
				return null;
			else
				return new WobWrapper(results[0].id);
		} else {
			return null;
		}
	}

	public requiresAsync(name: string): boolean {
		return true;
	}

	private _world: World;
	private _injections: any;
}
