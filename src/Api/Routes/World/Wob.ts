/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { WorldRouterBase } from "./WorldRouterBase";
import { WorldRouter } from "./World";
import * as Wob from "../../Model/Wob";
import { ModelBase } from "../../Model/ModelBase";
import { WobCommon } from "../../WobCommon";
import * as World from "../../../World/All";

export class WobRouter extends WorldRouterBase {
	constructor(worldRouter: WorldRouter) {
		super();

		// Get a full set of info about a wob. Returns 404 if we can't find the wob.
		worldRouter.router.get("/wob/:id/info", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,
			()=>this.getInfo(rq,rs,n)); });

		// Set a (potentially) full set of info about a wob. This doesn't deal with properties or verbs, just intrinsic wob info like the base and location.
		worldRouter.router.put("/wob/:id/info", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,
			()=>this.setInfo(rq,rs,n)); });

		// Get a list of wob IDs for the contents of another wob. Returns 404 if we can't find the wob.
		worldRouter.router.get("/wob/:id/content-ids", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,
			()=>this.contentIds(rq,rs,n)); });

		// Get a list of wob info for the contents of another wob. Returns 404 if we can't find the wob.
		worldRouter.router.get("/wob/:id/contents", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,
			()=>this.contents(rq,rs,n)); });

		// Check whether a given wob or wobs is descended from a given other
		// wob.
		//
		// :ids may be a comma-separated list of wob IDs
		// :ancestorid is the ID of the wob we are testing against
		//
		// Returns a Wob.InstanceOfList.
		worldRouter.router.get("/wob/:ids/instanceof/:ancestorid", (rq,rs,n) => { this.asyncWrapperLoggedIn(rq,rs,n,
			()=>this.instanceOf(rq,rs,n)); });
	}


	private async getInfo(req, res, next): Promise<any> {
		let id = req.params.id;

		let wob = await this.getWob(id, res);
		if (!wob)
			return;

		let player = await this.world.getWob(this.token.wobId);
		let rv = await WobCommon.GetInfo(wob, player, this.token.admin, this.world);

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
		let player = await this.world.getWob(this.token.wobId);
		let wobinfos = [];
		for (let w of subwobs) {
			let info = await WobCommon.GetInfo(w, player, this.token.admin, this.world);

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
