/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/
"use strict";
///<reference path="../typings/globals/node/index.d.ts" />

import * as World from "./World/All";
import * as Database from "./Database/All";

let config = require("../config");

let sal = new Database.AccessLayer(config);
let world = new World.World(new World.Database(sal));

async function exporter() {
	// Create a small in-world "game world" to test with (or load the database).
	await world.createDefault("./notes/init");

	// And export it to the specified output path.
	await World.ImportExport.Export(world, "./export");
}

exporter()
	.then(() => {
		process.exit(0);
	})
	.catch(err => {
		console.log(err, err.stack);
	});
