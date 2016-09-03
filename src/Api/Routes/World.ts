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

		// Set the value of one or more binary properties on a wob. Returns 404 if we can't find the wob.
		// Note that you can set non-binary properties, too, as JSON, but the other interface is probably simpler.
		this.router.put("/wob/:id/properties/binary", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n, ()=>this.setPropertyBinary(rq,rs,n)); });

		// Set the value of one or more properties on a wob. Returns 404 if we can't find the wob.
		// Note that this does not allow setting binary properties, only JSON.
		this.router.put("/wob/:id/properties", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n, ()=>this.setProperty(rq,rs,n)); });

		// Delete a property on a wob. Returns 404 if we can't find the wob.
		this.router.delete("/wob/:id/property/:name", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n, ()=>this.deleteProperty(rq,rs,n)); });

		// Get a sub-value of a property on a wob. Returns 404 if we can't find the wob, the property on the wob,
		// or the sub-property on the property. Note that this does not work on inherited properties.
		this.router.get("/wob/:id/property/:name/sub/:sub", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n, ()=>this.getPropertySub(rq,rs,n)); });

		// Delete a sub-value of a property on a wob. Returns 404 if we can't find the wob, the property on the wob,
		// or the sub-property on the property.
		this.router.delete("/wob/:id/property/:name/sub/:sub", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n, ()=>this.deletePropertySub(rq,rs,n)); });

		// Set one or more sub-values of a property on a wob. Returns 404 if we can't find the wob.
		// If the property doesn't exist, we create it on the fly.
		// Note that this does not work on inherited properties.
		this.router.put("/wob/:id/property/:name/subs", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n, ()=>this.setPropertySub(rq,rs,n)); });

		// Get the code of a verb on a wob. Returns 404 if we can't find the wob or verb on the wob.
		this.router.get("/wob/:id/verb/:name", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n, ()=>this.getVerb(rq,rs,n)); });

		// Delete a verb on a wob. Returns 404 if we can't find the wob.
		this.router.delete("/wob/:id/verb/:name", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n, ()=>this.deleteVerb(rq,rs,n)); });

		// Set the code of one or more verbs on a wob. Returns 404 if we can't find the wob.
		this.router.put("/wob/:id/verbs", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n, ()=>this.setVerbs(rq,rs,n)); });

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

	// This attempts to locate a wob contextually, by a global ID, integer, or partial
	// name of something in the room with the player. This works off the same rules
	// as InputParser, it just adds raw number support.
	private async getWob(id: string, res): Promise<World.Wob> {
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
	private async readChecks(srcWobId: number, furtherChecks: (srcWob: World.Wob) => boolean, res: any): Promise<any> {
		if (this.token.admin)
			return true;

		let srcWob = await this.world.getWob(srcWobId);
		if (!srcWob) {
			res.status(500).json(new ModelBase(false, "Can't find property's wob to test security"));
			return false;
		}

		return furtherChecks(srcWob);
	}

	// Checks to see if the user has the ability to read from the specified property on the specified wob.
	// This is async because we look up the wob (it is often not the same wob that was read).
	private async checkPropertyRead(srcWobId: number, prop: string, res: any): Promise<boolean> {
		return await this.readChecks(srcWobId, wob => {
			if (!World.Security.CheckPropertyRead(wob, prop, this.token.wobId)) {
				res.status(403).json(new ModelBase(false, "Access denied for reading property"));
				return false;
			}

			return true;
		}, res);
	}

	// Checks to see if the user has the ability to write to the specified property on the specified wob.
	// If we don't have the property, it checks to see if the user can write new properties.
	private checkPropertyWrite(wob: World.Wob, prop: string, res: any): boolean {
		if (this.token.admin)
			return true;

		if (wob.getProperty(prop)) {
			if (!World.Security.CheckPropertyWrite(wob, prop, this.token.wobId)) {
				res.status(403).json(new ModelBase(false, "Access denied writing to one or more properties"));
				return false;
			}
		} else {
			if (!World.Security.CheckWobWrite(wob, this.token.wobId)) {
				res.status(403).json(new ModelBase(false, "Access denied for writing new properties to this wob"));
				return false;
			}
		}

		return true;
	}

	// Checks to see if the user has the ability to read from the specified verb on the specified wob.
	// This is async because we look up the wob (it is often not the same wob that was read).
	private async checkVerbRead(srcWobId: number, verb: string, res: any): Promise<boolean> {
		return await this.readChecks(srcWobId, wob => {
			if (!World.Security.CheckVerbRead(wob, verb, this.token.wobId)) {
				res.status(403).json(new ModelBase(false, "Access denied for reading verb"));
				return false;
			}

			return true;
		}, res);
	}

	// Checks to see if the user has the ability to write to the specified verb on the specified wob.
	// If we don't have the verb, it checks to see if the user can write new verbs.
	private checkVerbWrite(wob: World.Wob, prop: string, res: any): boolean {
		if (this.token.admin)
			return true;

		if (wob.getVerb(prop)) {
			if (!World.Security.CheckVerbWrite(wob, prop, this.token.wobId)) {
				res.status(403).json(new ModelBase(false, "Access denied writing to one or more verbs"));
				return false;
			}
		} else {
			if (!World.Security.CheckWobWrite(wob, this.token.wobId)) {
				res.status(403).json(new ModelBase(false, "Access denied for writing new verbs to this wob"));
				return false;
			}
		}

		return true;
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

		if (!(await this.checkPropertyRead(prop.wob, name, res)))
			return;

		let perms = prop.value.perms;
		let permsEffective = perms;
		if (!permsEffective)
			permsEffective = World.Security.GetDefaultPropertyPerms();
		let metadata = new Wob.Property(
			prop.wob,
			name,
			undefined,
			perms,
			permsEffective);

		// We have to special case this for now.
		if (prop.value.value instanceof Petal.PetalBlob) {
			let value: any = prop.value.value.data;
			if (base64)
				value = value.toString("base64");
			res.set("X-Property-Metadata", JSON.stringify(metadata));
			res.set("Content-Type", prop.value.value.mime)
				.send(value);
		} else {
			metadata.value = Petal.ObjectWrapper.Unwrap(prop.value.value);
			res.json(metadata);
		}
	}

	private async setProperty(req, res, next): Promise<any> {
		let id = req.params.id;

		let wob = await this.getWob(id, res);
		if (!wob)
			return;

		let props = Petal.Utils.GetPropertyNames(req.body);

		// Check all the permissions up front.
		for (let prop of props) {
			if (!this.checkPropertyWrite(wob, prop, res))
				return;
		}

		for (let prop of props) {
			wob.setPropertyKeepingPerms(prop, req.body[prop]);
		}

		res.json(new ModelBase(true));
	}

	private async deleteProperty(req, res, next): Promise<any> {
		let id = req.params.id;
		let name = req.params.name;

		let wob = await this.getWob(id, res);
		if (!wob)
			return;

		if (!this.token.admin && !World.Security.CheckWobWrite(wob, this.token.wobId)) {
			res.status(403).json(new ModelBase(false, "Access denied for deleting properties from this wob"));
			return;
		}

		wob.deleteProperty(name);

		res.json(new ModelBase(true));
	}

	private async setPropertyBinary(req, res, next): Promise<any> {
		await Multer.upload(req, res);

		let id = req.params.id;
		let value = req.body;
		let files = req.files;

		let wob = await this.getWob(id, res);
		if (!wob)
			return;

		let names = Petal.Utils.GetPropertyNames(value);

		// Check all the permissions up front.
		for (let n of names) {
			if (!this.checkPropertyWrite(wob, n, res))
				return;
		}
		for (let f of files) {
			if (!this.checkPropertyWrite(wob, f.fieldname, res))
				return;
		}

		// Set all the non-binary values.
		for (let n of names) {
			// Multer processes this, not the JSON body middleware, so we have
			// to do our own JSON handling on it.
			wob.setPropertyKeepingPerms(n, Petal.ObjectWrapper.Wrap(JSON.parse(value[n])));
		}

		// And all the binary ones.
		for (let f of files) {
			let n = f.fieldname;
			let blob = new Petal.PetalBlob(f.buffer, f.mimetype, f.originalname);
			wob.setPropertyKeepingPerms(n, blob);
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

		if (!this.token.admin && !World.Security.CheckPropertyRead(wob, name, this.token.wobId)) {
			res.status(403).json(new ModelBase(false, "Access denied for reading property"));
			return;
		}

		let prop = wob.getProperty(name);
		if (!prop) {
			res.status(404).json(new ModelBase(false, "Property does not exist on wob"));
			return;
		}

		if (!(prop.value instanceof Petal.PetalObject)) {
			res.status(500).json(new ModelBase(false, "Property is not an object"));
			return;
		}

		if (prop.value.has(sub)) {
			let perms = prop.perms;
			let permsEffective = perms;
			if (!permsEffective)
				permsEffective = World.Security.GetDefaultPropertyPerms();
			res.json(new Wob.Property(wob.id, name, prop.value.get(sub), perms, permsEffective, sub));
		} else
			res.status(404).json(new ModelBase(false, "Sub-property does not exist"));
	}

	private async setPropertySub(req, res, next): Promise<any> {
		let id = req.params.id;
		let name = req.params.name;

		let wob = await this.getWob(id, res);
		if (!wob)
			return;

		// This requires both reading and writing.
		if (!this.token.admin && !World.Security.CheckProperty(wob, name, this.token.wobId, World.Perms.r | World.Perms.w)) {
			res.status(403).json(new ModelBase(false, "Access denied for reading and writing property"));
			return;
		}

		let prop = wob.getProperty(name);
		if (!prop) {
			// If property doesn't currently exist, create one.
			prop = new World.Property(Petal.ObjectWrapper.Wrap({}));
		}

		if (!(prop.value instanceof Petal.PetalObject)) {
			res.status(500).json(new ModelBase(false, "Property is not an object"));
			return;
		}

		for (let sub of Petal.Utils.GetPropertyNames(req.body)) {
			prop.value.set(sub, req.body[sub]);
		}

		wob.setProperty(name, prop);

		res.json(new ModelBase(true));
	}

	private async deletePropertySub(req, res, next): Promise<any> {
		let id = req.params.id;
		let name = req.params.name;
		let sub = req.params.sub;

		let wob = await this.getWob(id, res);
		if (!wob)
			return;

		// This requires both reading and writing.
		if (!this.token.admin && !World.Security.CheckProperty(wob, name, this.token.wobId, World.Perms.r | World.Perms.w)) {
			res.status(403).json(new ModelBase(false, "Access denied for reading and writing property"));
			return;
		}

		let prop = wob.getProperty(name);
		if (!prop) {
			res.status(404).json(new ModelBase(false, "Property does not exist"));
			return;
		}

		if (!(prop.value instanceof Petal.PetalObject)) {
			res.status(500).json(new ModelBase(false, "Property is not an object"));
			return;
		}

		prop.value.delete(sub);

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

		if (!(await this.checkVerbRead(verb.wob, name, res)))
			return;

		let perms = verb.value.perms;
		let permsEffective = perms;
		if (!permsEffective)
			permsEffective = World.Security.GetDefaultVerbPerms();

		res.json(new Wob.Verb(
			verb.wob,
			name,
			verb.value.signatureStrings,
			verb.value.code,
			perms,
			permsEffective
		));
	}

	private async deleteVerb(req, res, next): Promise<any> {
		let id = req.params.id;
		let name = req.params.name;

		let wob = await this.getWob(id, res);
		if (!wob)
			return;

		if (!this.token.admin && !World.Security.CheckWobWrite(wob, this.token.wobId)) {
			res.status(403).json(new ModelBase(false, "Access denied deleting verbs on wob"));
			return;
		}

		wob.deleteVerb(name);

		res.json(new ModelBase(true));
	}

	private async setVerbs(req, res, next): Promise<any> {
		let id = req.params.id;
		let values = req.body;

		let wob = await this.getWob(id, res);
		if (!wob)
			return;

		let names = Petal.Utils.GetPropertyNames(values);
		let errors = {};
		let anyErrors = false;

		// Check permissions on everything first.
		for (let n of names) {
			if (!this.checkVerbWrite(wob, n, res))
				return;
		}

		// Now go through and set all the verbs.
		for (let n of names) {
			let verbSet: Wob.VerbSet = values[n];
			try {
				wob.setVerbCode(n, verbSet.sigs, verbSet.code);
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

		// If they don't have read access on the wob, remove the lists of properties and verbs.
		if (!this.token.admin && !World.Security.CheckWobRead(wob, this.token.wobId)) {
			delete rv.properties;
			delete rv.verbs;
		}

		res.json(rv);
	}

	private async setInfo(req, res, next): Promise<any> {
		let id = req.params.id;
		let body: Wob.Info = req.body;

		let wob = await this.getWob(id, res);
		if (!wob)
			return;

		// If they don't have write access on the wob, we pretty much can't let them do anything here.
		if (!this.token.admin && !World.Security.CheckWobRead(wob, this.token.wobId)) {
			res.status(403).json(new ModelBase(false, "Access denied writing to wob info"));
			return;
		}

		if (body.base)
			wob.base = body.base;
		if (body.container && wob.container != body.container) {
			await World.Actions.Move(this.world, wob.id, body.container);
		}

		// TODO: Security bits.

		res.json(new ModelBase(true));
	}

	private async contentIds(req, res, next): Promise<any> {
		let id = req.params.id;

		let wob = await this.getWob(id, res);
		if (!wob)
			return;

		if (!this.token.admin && !World.Security.CheckWobRead(wob, this.token.wobId)) {
			res.status(403).json(new ModelBase(false, "Access denied reading wob contents"));
			return;
		}

		res.json(new Wob.IdList(wob.contents));
	}

	private async contents(req, res, next): Promise<any> {
		let id = req.params.id;

		// Get our target wob, then query for all the sub-wobs.
		let wob = await this.getWob(id, res);
		if (!wob)
			return;

		if (!this.token.admin && !World.Security.CheckWobRead(wob, this.token.wobId)) {
			res.status(403).json(new ModelBase(false, "Access denied reading wob contents"));
			return;
		}

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
