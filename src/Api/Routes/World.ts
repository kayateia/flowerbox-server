/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

///<reference path="../../../typings/globals/express/index.d.ts" />

import { RouterBase } from "./RouterBase";
import { ModelBase } from "../Model/ModelBase";
import * as Wob from "../Model/Wob";
import * as Petal from "../../Petal/All";
import * as World from "../../World/All";

export class WorldRouter extends RouterBase {
	constructor() {
		super();

		this.router.get("/wob/:id/property/:name", (rq,rs,n) => { this.asyncWrapper(rq,rs,n, ()=>this.getProperty(rq,rs,n)); });
		this.router.get("/wob/:id/info", (rq,rs,n) => { this.asyncWrapper(rq,rs,n,()=>this.info(rq,rs,n)); });
	}

	private async getProperty(req, res, next): Promise<any> {
		let id = req.params.id;
		let name = req.params.name;

		let wob = await this.world.getWob(parseInt(id, 10));
		if (!wob)
			return res.json(new ModelBase(false, "Unknown wob ID"));

		let prop = await wob.getPropertyI(name, this.world);
		return res.json(new Wob.Property(
			prop.wob,
			name,
			Petal.ObjectWrapper.Unwrap(prop)
		));
	}

	private async info(req, res, next): Promise<any> {
		let id = req.params.id;

		let wob = await this.world.getWob(parseInt(id, 10));
		if (!wob)
			return res.json(new ModelBase(false, "Unknown wob ID"));

		let base = wob.base;
		let container = wob.container;

		let name = await wob.getPropertyI(World.WobProperties.Name, this.world);
		let desc = await wob.getPropertyI(World.WobProperties.Description, this.world);
		let globalid = wob.getProperty(World.WobProperties.GlobalId);

		let properties = await wob.getPropertyNamesI(this.world);
		let verbs = await wob.getVerbNamesI(this.world);

		let rv = new Wob.Info(id, base, container, name.value, desc.value, globalid,
			properties.map(p => new Wob.AttachedItem(p.wob, p.value)),
			verbs.map(v => new Wob.AttachedItem(v.wob, v.value)));

		return res.json(rv);
	}
}

export let worldRouter = new WorldRouter();
