/*
	Flowerbox
	Copyright (C) 2016 Dove
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

///<reference path="../../../typings/globals/express/index.d.ts" />

import { RouterBase } from "./RouterBase";
import { ModelBase } from "../Model/ModelBase";
import * as Wob from "../Model/Wob";

export class WorldRouter extends RouterBase {
	constructor() {
		super();

		this.router.get("/wob/:id/property/:name", (rq,rs,n) => { this.getProperty(rq, rs, n); });
	}

	private getProperty(req, res, next): void {
		this.world.getWob(parseInt(req.params.id, 10))
			.then(w => {
				return w.getPropertyI(req.params.name, this.world);
			})
			.then(pv => {
				return res.json(new Wob.Property(
					req.params.id,
					req.params.name,
					pv
				));
			})
			.catch(err => {
				return res.json(new ModelBase(false, err));
			});
	}
}

export let worldRouter = new WorldRouter();
