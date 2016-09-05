/*
	Flowerbox
	Copyright (C) 2016 Dove
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

///<reference path="../../typings/globals/express/index.d.ts" />

import * as express from "express";
import * as World from "../World/All";
import * as Database from "../Database/All";
import { indexRouter } from "./Routes/Index";
import { terminalRouter } from "./Routes/Terminal";
import { userRouter } from "./Routes/User";
import { worldRouter } from "./Routes/World";
import { ModelBase } from "./Model/ModelBase";

const bodyParser = require("body-parser");

export let app = express();

let config = require("../../config");

let sal = new Database.AccessLayer(config);
let world = new World.World(new World.Database(sal));

let cors = require("cors");

async function worldStartup() {
	// Create a small in-world "game world" to test with.
	await world.createDefault("./notes/init");
	for (let r of [indexRouter, terminalRouter, userRouter, worldRouter]) {
		r.world = world;
		r.config = config;
	}
}

worldStartup()
	.then(() => {
		app.use(cors());
		app.use(bodyParser.json());
		app.use(bodyParser.urlencoded({ extended: false }));

		app.use("/", indexRouter.router);
		app.use("/terminal", terminalRouter.router);
		app.use("/user", userRouter.router);
		app.use("/world", worldRouter.router);

		// Catch 404 and forward to error handler.
		app.use((req, res, next) => {
			res.status(404).json(new ModelBase(false, "Unknown route"));
		});
	})
	.catch(err => {
		console.log("Can't start up world.", err);
	});
