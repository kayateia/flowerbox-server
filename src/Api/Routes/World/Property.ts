/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { WorldRouterBase } from "./WorldRouterBase";
import { ModelBase } from "../../Model/ModelBase";
import { WorldRouter } from "./World";
import { WobCommon } from "../../WobCommon";
import * as Wob from "../../Model/Wob";
import * as World from "../../../World/All";
import * as Petal from "../../../Petal/All";
import * as Multer from "../../Multer";

// Strict definition for the return value of PropertyPermsCommon().
interface PropertyPermsCommonInfo {
	id: string;
	name: string;
	wob: World.Wob;
	prop: World.Property;
}

export class PropertyRouter extends WorldRouterBase {
	constructor(worldRouter: WorldRouter) {
		super();

		// Get the value of a property on a wob. Returns 404 if we can't find the wob or property on the wob.
		worldRouter.router.get("/wob/:id/property/:name", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,
			()=>this.getProperty(rq,rs,n)); });

		// Set the value of one or more binary properties on a wob. Returns 404 if we can't find the wob.
		// Note that you can set non-binary properties, too, as JSON, but the other interface is probably simpler.
		worldRouter.router.put("/wob/:id/properties/binary", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,
			()=>this.setPropertyBinary(rq,rs,n)); });

		// Set the value of one or more properties on a wob. Returns 404 if we can't find the wob.
		// Note that this does not allow setting binary properties, only JSON.
		worldRouter.router.put("/wob/:id/properties", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,
			()=>this.setProperty(rq,rs,n)); });

		// Delete a property on a wob. Returns 404 if we can't find the wob.
		worldRouter.router.delete("/wob/:id/property/:name", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,
			()=>this.deleteProperty(rq,rs,n)); });

		// Get the security of a property on a wob. Returns 404 if we can't find the wob or property.
		worldRouter.router.get("/wob/:id/property/:name/perms", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,
			()=>this.getPropertyPerms(rq,rs,n)); });

		// Set (or delete) the security of a property on a wob. Returns 404 if we can't find the wob or property.
		worldRouter.router.put("/wob/:id/property/:name/perms", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,
			()=>this.putPropertyPerms(rq,rs,n)); });

		// Get a sub-value of a property on a wob. Returns 404 if we can't find the wob, the property on the wob,
		// or the sub-property on the property. Note that this does not work on inherited properties.
		worldRouter.router.get("/wob/:id/property/:name/sub/:sub", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,
			()=>this.getPropertySub(rq,rs,n)); });

		// Delete a sub-value of a property on a wob. Returns 404 if we can't find the wob, the property on the wob,
		// or the sub-property on the property.
		worldRouter.router.delete("/wob/:id/property/:name/sub/:sub", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,
			()=>this.deletePropertySub(rq,rs,n)); });

		// Set one or more sub-values of a property on a wob. Returns 404 if we can't find the wob.
		// If the property doesn't exist, we create it on the fly.
		// Note that this does not work on inherited properties.
		worldRouter.router.put("/wob/:id/property/:name/subs", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,
			()=>this.setPropertySub(rq,rs,n)); });
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

	// Common end-of-code for both types of property getters.
	private getPropertySend(value: any, metadata: Wob.Property, req, res): void {
		let base64 = req.query.base64;

		// We have to special case this for now.
		if (value instanceof Petal.PetalBlob) {
			let data: any = value.data;
			if (base64)
				data = data.toString("base64");
			res.set("Access-Control-Expose-Headers", "X-Property-Metadata");
			res.set("X-Property-Metadata", JSON.stringify(metadata));
			res.set("Content-Type", value.mime)
				.send(data);
		} else {
			metadata.value = Petal.ObjectWrapper.Unwrap(value);
			res.json(metadata);
		}
	}

	// This version only deals with literal (constant) property values.
	private async getPropertyLiteral(name: string, prop: World.WobValue<World.Property>, req, res): Promise<any> {
		if (!(await this.checkPropertyRead(prop.wob, name, res)))
			return;

		let perms = World.Perms.unparse(prop.value.perms);
		let permsEffective = perms;
		if (!permsEffective)
			permsEffective = World.Security.GetDefaultPropertyString();

		let ownerEffective: number = await WobCommon.GetPropertyOwner(name, prop.wob, prop.value, this.world);

		let metadata = new Wob.Property(
			prop.wob,
			name,
			undefined,
			perms,
			permsEffective,
			ownerEffective);

		this.getPropertySend(prop.value.value, metadata, req, res);
	}

	// This version only deals with computed property values.
	private async getPropertyComputed(wob: World.Wob, name: string, verb: World.WobValue<World.Verb>, req, res): Promise<any> {
		let base64 = req.query.base64;

		if (!World.Security.CheckVerbExecute(wob, "@" + name, this.token.wobId)) {
			res.status(403).json(new ModelBase(false, "Access denied executing computed property"));
			return;
		}

		let perms = World.Perms.unparse(verb.value.perms);
		let permsEffective = perms;
		if (!permsEffective)
			permsEffective = World.Security.GetDefaultVerbString();

		let ownerEffective: number = await WobCommon.GetVerbOwner(verb.wob, verb.value, this.world);

		let metadata = new Wob.Property(
			verb.wob,
			name,
			undefined,
			perms,
			permsEffective,
			ownerEffective);
		metadata.computed = true;

		// Get the player wob.
		let player: World.Wob = await this.world.getWob(this.token.wobId);

		// Execute the verb code to get the property value.
		let result = await World.executeFunction(null, player, this.token.admin, this.world, verb.value.address, verb.wob);
		let value = result.returnValue;

		this.getPropertySend(value, metadata, req, res);
	}

	private async getProperty(req, res, next): Promise<any> {
		let id = req.params.id;
		let name = req.params.name;

		let wob = await this.getWob(id, res);
		if (!wob)
			return;

		// Find our property, if it's out there.
		let prop = await wob.getPropertyI(name, this.world);
		if (!prop) {
			res.status(404).json(new ModelBase(false, "Property does not exist on wob"));
			return;
		}

		// Did we get a verb or a real property?
		if (prop.value.value instanceof World.Verb) {
			let verbSrc = new World.WobValue<World.Verb>(prop.wob, prop.value.value);
			return this.getPropertyComputed(wob, name, verbSrc, req, res);
		} else
			return this.getPropertyLiteral(name, prop, req, res);

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

	private async propertyPermsCommon(req, res, next): Promise<PropertyPermsCommonInfo> {
		let id = req.params.id;
		let name = req.params.name;

		let wob = await this.getWob(id, res);
		if (!wob)
			return null;

		let prop = wob.getProperty(name);
		if (!prop) {
			res.status(404).json(new ModelBase(false, "Property does not exist on wob"));
			return null;
		}

		return {
			id: id,
			name: name,
			wob: wob,
			prop: prop
		};
	}

	private async getPropertyPerms(req, res, next): Promise<any> {
		let info = await this.propertyPermsCommon(req, res, next);
		if (!info)
			return;

		if (!this.token.admin && !World.Security.CheckWobRead(info.wob, this.token.wobId)) {
			res.status(403).json(new ModelBase(false, "Access denied for getting security on properties from this wob"));
			return null;
		}

		// If the property doesn't have permissions set, we use the defaults.
		let perms: string = World.Perms.unparse(info.prop.perms);
		let permsEffective: string = perms;
		if (perms === undefined)
			permsEffective = World.Security.GetDefaultPropertyString();

		let ownerEffective: number = await WobCommon.GetPropertyOwner(info.name, info.wob.id, info.prop, this.world);

		res.json(new Wob.PermsStatus(perms, permsEffective, ownerEffective));
	}

	private async putPropertyPerms(req, res, next): Promise<any> {
		let body: Wob.PermsSet = req.body;
		let perms: any = body.perms;

		let info = await this.propertyPermsCommon(req, res, next);
		if (!info)
			return;

		if (!this.token.admin && !World.Security.CheckWobWrite(info.wob, this.token.wobId)) {
			res.status(403).json(new ModelBase(false, "Access denied for setting security on properties from this wob"));
			return null;
		}

		// For now, assume that we are getting numeric values here; will have to adjust.
		// TODO: Deal with non-numeric inputs.
		let prop: World.Property = info.prop;
		prop.perms = World.Perms.parse(perms);
		info.wob.setProperty(info.name, prop);

		// If the property doesn't have permissions set, we use the defaults.
		let permsEffective: string = World.Perms.unparse(prop.perms);
		if (perms === undefined)
			permsEffective = World.Security.GetDefaultPropertyString();

		let ownerEffective: number = await WobCommon.GetPropertyOwner(info.name, info.wob.id, info.prop, this.world);

		res.json(new Wob.PermsStatus(perms, permsEffective, ownerEffective));
	}

	private async getPropertySub(req, res, next): Promise<any> {
		let id: string = req.params.id;
		let name: string = req.params.name;
		let sub: string = req.params.sub;

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
			let perms = World.Perms.unparse(prop.perms);
			let permsEffective = perms;
			if (!permsEffective)
				permsEffective = World.Security.GetDefaultPropertyString();

			res.json(new Wob.Property(wob.id, name, prop.value.get(sub), perms, permsEffective, wob.owner, sub));
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

		if (!prop.value.keys.length) {
			// If all sub-properites have been deleted, also delete the
			// property that was containing them.
			wob.deleteProperty(name);
		}
		else {
			wob.setProperty(name, prop);
		}

		res.json(new ModelBase(true));
	}
}
