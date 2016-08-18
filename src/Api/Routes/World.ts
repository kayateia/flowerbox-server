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
		this.router.put("/wob/:id/properties", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n, ()=>this.setProperty(rq,rs,n)); });

		// Get a sub-value of a property on a wob. Returns 404 if we can't find the wob, the property on the wob,
		// or the sub-property on the property. Note that this does not work on inherited properties.
		this.router.get("/wob/:id/property/:name/sub/:sub", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n, ()=>this.getPropertySub(rq,rs,n)); });

		// Set one or more sub-values of a property on a wob. Returns 404 if we can't find the wob.
		// If the property doesn't exist, we create it on the fly.
		// Note that this does not work on inherited properties.
		this.router.put("/wob/:id/property/:name/subs", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n, ()=>this.setPropertySub(rq,rs,n)); });

		// Get the code of a verb on a wob. Returns 404 if we can't find the wob or verb on the wob.
		this.router.get("/wob/:id/verb/:name", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n, ()=>this.getVerb(rq,rs,n)); });

		// Set the code of one or more verbs on a wob. Returns 404 if we can't find the wob.
		this.router.put("/wob/:id/verbs", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n, ()=>this.setVerb(rq,rs,n)); });

		// Get a full set of info about a wob. Returns 404 if we can't find the wob.
		this.router.get("/wob/:id/info", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,()=>this.getInfo(rq,rs,n)); });

		// Set a (potentially) full set of info about a wob. This doesn't deal with properties or verbs, just intrinsic wob info like the base and location.
		this.router.put("/wob/:id/info", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,()=>this.setInfo(rq,rs,n)); });

		// Get a list of wob IDs for the contents of another wob. Returns 404 if we can't find the wob.
		this.router.get("/wob/:id/content-ids", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,()=>this.contentIds(rq,rs,n)); });

		// Get a list of wob info for the contents of another wob. Returns 404 if we can't find the wob.
		this.router.get("/wob/:id/contents", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,()=>this.contents(rq,rs,n)); });

		// Check whether a given wob or wobs is descended from a given other
		// wob.
		//
		// :ids may be a comma-separated list of wob IDs
		// :ancestorid is the ID of the wob we are testing against
		//
		// Returns a Wob.InstanceOfList.
		this.router.get("/wob/:ids/instanceof/:ancestorid", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,()=>this.instanceOf(rq,rs,n)); });
	}

	private async getWob(id: string, res): Promise<World.Wob> {
		let wob: World.Wob;
		if (id.startsWith("@")) {
			let wobs = await this.world.getWobsByGlobalId([id.substr(1)]);
			wob = wobs[0];
		} else if (id.startsWith("#")) {
			wob = await this.world.getWob(parseInt(id.substr(1), 10));
		} else {
			// Assume it's a number.
			wob = await this.world.getWob(parseInt(id, 10));
		}
		if (!wob) {
			res.status(404).json(new ModelBase(false, "Unknown wob ID"));
			return null;
		}

		return wob;
	}

	private async getProperty(req, res, next): Promise<any> {
		let id = req.params.id;
		let name = req.params.name;
		let base64 = req.query.base64;

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
			let value = prop.value.data;
			if (base64)
				value = value.toString("base64");
			res.set("Content-Type", prop.value.mime)
				.send(value);
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
		for (let n of names) {
			// Multer processes this, not the JSON body middleware, so we have
			// to do our own JSON handling on it.
			wob.setProperty(n, Petal.ObjectWrapper.Wrap(JSON.parse(value[n])));
		}

		for (let f of files) {
			let n = f.fieldname;
			let blob = new Petal.PetalBlob(f.buffer, f.mimetype, f.originalname);
			wob.setProperty(n, blob);
		}

		res.json(new ModelBase(true));
	}

	private async getPropertySub(req, res, next): Promise<any> {
		let id = req.params.id;
		let name = req.params.name;
		let sub = req.params.sub;

		let wob = await this.getWob(id, res);
		if (!wob)
			return;

		let prop = wob.getProperty(name);
		if (!prop) {
			res.status(404).json(new ModelBase(false, "Property does not exist on wob"));
			return;
		}

		if (!(prop instanceof Petal.PetalObject)) {
			res.status(500).json(new ModelBase(false, "Property is not an object"));
			return;
		}

		res.json(new Wob.Property(wob.id, name, prop.get(sub), sub));
	}

	private async setPropertySub(req, res, next): Promise<any> {
		let id = req.params.id;
		let name = req.params.name;

		let wob = await this.getWob(id, res);
		if (!wob)
			return;

		let prop = wob.getProperty(name);
		if (!prop) {
			// If property doesn't currently exist, create one.
			prop = Petal.ObjectWrapper.Wrap({});
		}

		if (!(prop instanceof Petal.PetalObject)) {
			res.status(500).json(new ModelBase(false, "Property is not an object"));
			return;
		}

		for (let sub of Petal.Utils.GetPropertyNames(req.body)) {
			prop.set(sub, req.body[sub]);
		}

		wob.setProperty(name, prop);

		res.json(new ModelBase(true));
	}

	private async getVerb(req, res, next): Promise<any> {
		let id = req.params.id;
		let name = req.params.name;

		let wob = await this.getWob(id, res);
		if (!wob)
			return;

		let verb = await wob.getVerbI(name, this.world);
		if (!verb) {
			res.status(404).json(new ModelBase(false, "Verb does not exist on wob"));
			return;
		}

		res.json(new Wob.Verb(
				verb.wob,
				name,
				verb.value.signatureStrings,
				verb.value.code
			));
	}

	private async setVerb(req, res, next): Promise<any> {
		// We aren't going to have any file uploads, but this allows us to make
		// use of multi-part form submissions for multiple verb setting at once.
		await Multer.upload(req, res);

		let id = req.params.id;
		let value = req.body;

		let wob = await this.getWob(id, res);
		if (!wob)
			return;

		let names = Petal.Utils.GetPropertyNames(value);
		let errors = {};
		let anyErrors = false;
		for (let n of names) {
			try {
				wob.setVerbCode(n, value[n]);
			} catch (err) {
				anyErrors = true;
				errors[n] = err;
			}
		}

		if (anyErrors)
			res.status(500);
		else
			errors = undefined;
		res.json(new Wob.VerbSetErrors(errors));
	}

	private async getInfo(req, res, next): Promise<any> {
		let id = req.params.id;

		let wob = await this.getWob(id, res);
		if (!wob)
			return;

		let rv = await WobCommon.GetInfo(wob, this.world);
		res.json(rv);
	}

	private async setInfo(req, res, next): Promise<any> {
		let id = req.params.id;
		let body: Wob.Info = req.body;

		let wob = await this.getWob(id, res);
		if (!wob)
			return;

		if (body.base)
			wob.base = body.base;
		if (body.container && wob.container != body.container) {
			// FIXME: Move notifications.
			await this.world.moveWob(wob.id, body.container);
		}

		// TODO: Security bits.

		res.json(new ModelBase(true));
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

	private async instanceOf(req, res, next) {
		// If the ancestor wob can't be found, the whole request fails.
		let ancestorWob = await this.getWob(req.params.ancestorid, res);
		if (!ancestorWob) {
			return;
		}

		// Test each ID in the list to see if it's descended from the given
		// ancestor ID.
		let ids = req.params.ids.split(",");
		let results: Wob.InstanceOfResult[] = [];
		for (let i = 0; i < ids.length; i++) {
			let wob = await this.getWob(ids[i], res);

			// If any wob in the provided list of IDs is not found, the whole
			// request fails.
			if (!wob) {
				return;
			}
			let instance = await wob.instanceOf(ancestorWob.id, this.world);

			// Push the result of this test into the result set.
			results.push(new Wob.InstanceOfResult(ids[i], instance));
		}

		// If we got here, all wobs were found and tested without issue.
		res.json(new Wob.InstanceOfList(results));
	}
}

export let worldRouter = new WorldRouter();
