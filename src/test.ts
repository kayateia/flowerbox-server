/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/
"use strict";
///<reference path="../typings/globals/node/index.d.ts" />

import { Wob, WobProperties } from "./World/Wob";
import { Verb } from "./World/Verb";
import { World } from "./World/World";
import { executeResult } from "./World/Execution";
import * as InputParser from "./World/InputParser";
import * as readline from "readline";
import { InitWorld } from "./InitWorld";

let world = new World();

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

async function tester() {
	// Create a small in-world "game world" to test with.
	await world.createDefault(InitWorld);

	/*await world.moveWob(5, 4);
	await world.compostWob(6);*/

	// console.log(JSON.stringify(world, null, 4));

	// let wobs = await world.getWobs([3]);
	let wobs = await world.getWobsByPropertyMatch(WobProperties.Name, "Kayateia");
	(function nextLine() {
		rl.question('> ', (answer) => {
			InputParser.parseInput(answer, wobs[0], world)
				.then((match) => {
					executeResult(match, wobs[0], world)
						.then(() => {
							nextLine();
						})
						.catch((e) => {
							console.log(e, e.stack);
							nextLine();
						});
				})
				.catch((e) => {
					console.log(e, e.stack);
					nextLine();
				});
		});
	})();
}

tester()
	.catch(err => {
		console.log(err, err.stack);
	});
