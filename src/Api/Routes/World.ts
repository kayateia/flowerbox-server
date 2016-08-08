/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { RouterBase } from "./RouterBase";
import { ModelBase } from "../Model/ModelBase";
import * as Wob from "../Model/Wob";
import * as Petal from "../../Petal/All";
import * as World from "../../World/All";
import { WobCommon } from "../WobCommon";
import * as Multer from "../Multer";

export class WorldRouter extends RouterBase {
	constructor() {
		super();

		// Get the value of a property on a wob. Returns 404 if we can't find the wob or property on the wob.
		this.router.get("/wob/:id/property/:name", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n, ()=>this.getProperty(rq,rs,n)); });

		// Set the value of one or more properties on a wob. Returns 404 if we can't find the wob.
		this.router.put("/wob/:id/property", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n, ()=>this.setProperty(rq,rs,n)); });

		// Get a full set of info about a wob. Returns 404 if we can't find the wob.
		this.router.get("/wob/:id/info", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,()=>this.info(rq,rs,n)); });

		// Get a list of wob IDs for the contents of another wob. Returns 404 if we can't find the wob.
		this.router.get("/wob/:id/content-ids", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,()=>this.contentIds(rq,rs,n)); });

		// Get a list of wob info for the contents of another wob. Returns 404 if we can't find the wob.
		this.router.get("/wob/:id/contents", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,()=>this.contents(rq,rs,n)); });
	}

	private async getWob(id: string, res): Promise<World.Wob> {
		let wob = await this.world.getWob(parseInt(id, 10));
		if (!wob) {
			res.status(404).json(new ModelBase(false, "Unknown wob ID"));
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
		if (!prop) {
			res.status(404).json(new ModelBase(false, "Property does not exist on wob"));
			return;
		}

		// We have to special case this for now.
		if (prop.value instanceof Petal.PetalBlob) {
			res.set("Content-Type", prop.value.mime)
				.send(prop.value.data);
		} else {
			res.json(new Wob.Property(
				prop.wob,
				name,
				Petal.ObjectWrapper.Unwrap(prop.value)
			));
		}
	}

	private async setProperty(req, res, next): Promise<any> {
		await Multer.upload(req, res);

		let id = req.params.id;
		let value = req.body;
		let files = req.files;

		let wob = await this.getWob(id, res);
		if (!wob)
			return;

		let names = Petal.Utils.GetPropertyNames(value);
		for (let n of names)
			wob.setProperty(n, Petal.ObjectWrapper.Wrap(value[n]));

		for (let f of files) {
			let n = f.fieldname;
			let blob = new Petal.PetalBlob(f.buffer, f.mimetype, f.originalname);
			wob.setProperty(n, blob);
		}

		res.json(new ModelBase(true));
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

		// FIXME: TypeScript thinks Promise.all returns Promise<Promise<Wob>[]>. See if they've
		// fixed this later and try it again without the <any>.
		let subwobs: World.Wob[] = <any>(await Promise.all(wob.contents.map(i => this.world.getWob(i))));

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
