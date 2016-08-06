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
import { WobCommon } from "../WobCommon";

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

	private async info(req, res, next): Promise<any> {
		let id = req.params.id;

		let wob = await this.getWob(id, res);
		if (!wob)
			return;

		let rv = await WobCommon.GetInfo(wob, this.world);
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
			let info = await WobCommon.GetInfo(w, this.world);

			// This is really terrible but there is no good language construct in TypeScript
			// to deal with this situation, and I won't copy and paste the whole class.
			delete info.success;

			wobinfos.push(info);
		}

		res.json(new Wob.InfoList(wobinfos));
	}
}

export let worldRouter = new WorldRouter();
