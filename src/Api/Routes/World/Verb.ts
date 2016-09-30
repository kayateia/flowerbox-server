/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { WorldRouterBase } from "./WorldRouterBase";
import { WorldRouter } from "./World";
import { ModelBase } from "../../Model/ModelBase";
import { WobCommon } from "../../WobCommon";
import * as Wob from "../../Model/Wob";
import * as Petal from "../../../Petal/All";
import * as World from "../../../World/All";

export class VerbRouter extends WorldRouterBase {
	constructor(worldRouter: WorldRouter) {
		super();

		// Get the code of a verb on a wob. Returns 404 if we can't find the wob or verb on the wob.
		worldRouter.router.get("/wob/:id/verb/:name", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,
			()=>this.getVerb(rq,rs,n)); });

		// Delete a verb on a wob. Returns 404 if we can't find the wob.
		worldRouter.router.delete("/wob/:id/verb/:name", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,
			()=>this.deleteVerb(rq,rs,n)); });

		// Set the code of one or more verbs on a wob. Returns 404 if we can't find the wob.
		worldRouter.router.put("/wob/:id/verbs", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,
			()=>this.setVerbs(rq,rs,n)); });

		// Get the security of a verb on a wob. Returns 404 if we can't find the wob or verb.
		worldRouter.router.get("/wob/:id/verb/:name/perms", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,
			()=>this.getVerbPerms(rq,rs,n)); });

		// Set (or delete) the security of a property on a wob. Returns 404 if we can't find the wob or property.
		worldRouter.router.put("/wob/:id/verb/:name/perms", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,
			()=>this.putVerbPerms(rq,rs,n)); });
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

		let perms = World.Perms.unparse(verb.value.perms);
		let permsEffective = perms;
		if (!permsEffective)
			permsEffective = World.Security.GetDefaultVerbString();

		let ownerEffective: number = await WobCommon.GetVerbOwner(verb, this.world);

		res.json(new Wob.Verb(
			verb.wob,
			name,
			verb.value.signatureStrings,
			verb.value.code,
			perms,
			permsEffective,
			ownerEffective
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

	private async verbPermsCommon(req, res, next) {
		let id = req.params.id;
		let name = req.params.name;

		let wob = await this.getWob(id, res);
		if (!wob)
			return null;

		let verb = wob.getVerb(name);
		if (!verb) {
			res.status(404).json(new ModelBase(false, "Verb does not exist on wob"));
			return null;
		}

		return {
			id: id,
			name: name,
			wob: wob,
			verb: verb
		};
	}

	private async getVerbPerms(req, res, next): Promise<any> {
		let info = await this.verbPermsCommon(req, res, next);
		if (!info)
			return;

		if (!this.token.admin && !World.Security.CheckWobRead(info.wob, this.token.wobId)) {
			res.status(403).json(new ModelBase(false, "Access denied for getting security on verbs from this wob"));
			return null;
		}

		// If the property doesn't have permissions set, we use the defaults.
		let verb: World.Verb = info.verb;
		let perms: string = World.Perms.unparse(verb.perms);
		let permsEffective: string = perms;
		if (perms === undefined)
			permsEffective = World.Security.GetDefaultVerbString();

		let ownerEffective: number = await WobCommon.GetVerbOwner(info.verb, this.world);

		res.json(new Wob.PermsStatus(perms, permsEffective, ownerEffective));
	}

	private async putVerbPerms(req, res, next): Promise<any> {
		let body: Wob.PermsSet = req.body;
		let perms: any = body.perms;

		let info = await this.verbPermsCommon(req, res, next);
		if (!info)
			return;

		if (!this.token.admin && !World.Security.CheckWobWrite(info.wob, this.token.wobId)) {
			res.status(403).json(new ModelBase(false, "Access denied for setting security on verbs from this wob"));
			return null;
		}

		// For now, assume that we are getting numeric values here; will have to adjust.
		// TODO: Deal with non-numeric inputs.
		let verb: World.Verb = info.verb;
		verb.perms = World.Perms.parse(perms);
		info.wob.setVerb(info.name, verb);

		// If the property doesn't have permissions set, we use the defaults.
		let permsEffective: string = World.Perms.unparse(verb.perms);
		if (perms === undefined)
			permsEffective = World.Security.GetDefaultVerbString();

		let ownerEffective: number = await WobCommon.GetVerbOwner(info.verb, this.world);

		res.json(new Wob.PermsStatus(perms, permsEffective, ownerEffective));
	}
}
