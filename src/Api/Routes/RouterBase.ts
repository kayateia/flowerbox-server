/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

///<reference path="../../../typings/globals/express/index.d.ts" />

import * as express from "express";
import * as World from "../../World/All";
import { ModelBase } from "../Model/ModelBase";

export class RouterBase {
	constructor() {
		this._router = express.Router();
	}

	// Calldown here should be an async function that returns an error on failure, or
	// null on success. (And in the null case, it should have called res.json or something.)
	public asyncWrapper(req, res, next, calldown: any): void {
		calldown(req, res, next)
			.then(err => {
				if (err)
					res.json(err);
			})
			.catch(err => {
				console.log(err, err.stack);
				if (!(err instanceof ModelBase))
					err = new ModelBase(false, err);
				res.json(err);
			});
	}

	// We'd use express.Router here, but the typing is fairly useless.
	public get router(): any {
		return this._router;
	}

	public get world(): World.World {
		return this._world;
	}

	public set world(world: World.World) {
		this._world = world;
	}

	private _router: any;
	private _world: World.World;
}
