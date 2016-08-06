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
		this.router.get("/wob/:id/content-ids", (rq,rs,n) => { this.asyncWrapper(rq,rs,n,()=>this.contentIds(rq,rs,n)); });
		this.router.get("/wob/:id/contents", (rq,rs,n) => { this.asyncWrapper(rq,rs,n,()=>this.contents(rq,rs,n)); });
	}

	private async getWob(id: string, res): Promise<World.Wob> {
		let wob = await this.world.getWob(parseInt(id, 10));
		if (!wob) {
			res.json(new ModelBase(false, "Unknown wob ID"));
			return null;
		}

		return wob;
	}

	private async getProperty(req, res, next): Promise<any> {
		let id = req.params.id;
		let name = req.params.name;

		let wob = await this.getWob(id, res);
		if (!wob)
			return;

		let prop = await wob.getPropertyI(name, this.world);
		res.json(new Wob.Property(
			prop.wob,
			name,
			Petal.ObjectWrapper.Unwrap(prop.value)
		));
	}

	// Gets all the Wob.Info data for a loaded wob.
	private async getInfo(wob: World.Wob): Promise<Wob.Info> {
		let base = wob.base;
		let container = wob.container;

		let name = await wob.getPropertyI(World.WobProperties.Name, this.world);
		let desc = await wob.getPropertyI(World.WobProperties.Description, this.world);
		let globalid = wob.getProperty(World.WobProperties.GlobalId);

		let properties = await wob.getPropertyNamesI(this.world);
		let verbs = await wob.getVerbNamesI(this.world);

		let rv = new Wob.Info(wob.id, base, container, name.value, desc.value, globalid,
			properties.map(p => new Wob.AttachedItem(p.wob, p.value)),
			verbs.map(v => new Wob.AttachedItem(v.wob, v.value)));
		return rv;
	}

	private async info(req, res, next): Promise<any> {
		let id = req.params.id;

		let wob = await this.getWob(id, res);
		if (!wob)
			return;

		let rv = await this.getInfo(wob);
		res.json(rv);
	}

	private async contentIds(req, res, next): Promise<any> {
		let id = req.params.id;

		let wob = await this.getWob(id, res);
		if (!wob)
			return;

		res.json(new Wob.IdList(wob.contents));
	}

	private async contents(req, res, next): Promise<any> {
		let id = req.params.id;

		// Get our target wob, then query for all the sub-wobs.
		let wob = await this.getWob(id, res);
		if (!wob)
			return;
		let subwobs = await Promise.all(wob.contents.map(i => this.world.getWob(i)));

		// Get the properties of each sub-wob.
		let wobinfos = [];
		for (let w of subwobs) {
			let info = await this.getInfo(w);

			// This is really terrible but there is no good language construct in TypeScript
			// to deal with this situation, and I won't copy and paste the whole class.
			delete info.success;

			wobinfos.push(info);
		}

		res.json(new Wob.InfoList(wobinfos));
	}
}

export let worldRouter = new WorldRouter();
