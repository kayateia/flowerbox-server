/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { ParseResult, ParseError } from "./InputParser";
import { Wob, EventType } from "./Wob";
import { World } from "./World";
import * as Petal from "../Petal/All";
import { DollarObject } from "./Execution/DollarObject";
import { DollarParse } from "./Execution/DollarParse";
import { WobWrapper, AccessorCargo, WobPropertyTag } from "./Execution/WobWrapper";
import { RootScope } from "./Execution/RootScope";
import { Perms } from "./Security";

function handleFailure(parse: ParseResult, player: Wob): void {
	switch (parse.failure) {
		case ParseError.NoVerb:
			player.event(EventType.ParseError, Date.now(), ["Don't understand."]);
			break;
		case ParseError.Ambiguous:
			player.event(EventType.ParseError, Date.now(), ["Ambiguous."]);
			break;
	}
}

function formatPetalException(runtime: Petal.Runtime, player: Wob, err: any) : void {
	let output;

	// Try to pull the official Petal stack off the error, if it has one. If not,
	// go to the runtime and try to pull one anyway.
	if (err.petalStack)
		output = [err.cause, " ", JSON.stringify(err.petalStack)];
	else
		output = [err.toString(), err.stack, JSON.stringify(runtime.getStackTrace())];
	player.event(EventType.ScriptError, Date.now(), output);
}

export async function executeResult(parse: ParseResult, player: Wob, playerIsAdmin: boolean, world: World): Promise<void> {
	// Get the environment ready.
	let injections: any = {};
	let cargo = new AccessorCargo(world, injections, player, playerIsAdmin);

	let dollarObj = new DollarObject(world, injections);
	let dollar = Petal.ObjectWrapper.WrapGeneric(dollarObj, DollarObject.Members, false);

	let dollarParseObj = new DollarParse(parse, player, world, injections);
	let dollarParse = Petal.ObjectWrapper.WrapGeneric(dollarParseObj, DollarParse.Members, false);

	let perms = Petal.ObjectWrapper.WrapGeneric(Perms, [ "r", "w", "x", "s", "group", "others" ]);

	injections.$ = dollar;
	injections.$parse = dollarParse;
	injections.$player = dollarParseObj.player;
	injections.$perms = perms;

	// Check for a global command handler on #1. If it exists, we'll call that first.
	let rootScope = new RootScope(world, injections);
	let changeRouter = (item: Petal.IPetalWrapper, runtime: Petal.Runtime) => {
		if (item.tag && item.tag instanceof WobPropertyTag) {
			let ww: WobPropertyTag = item.tag;
			ww.wob.changeNotification(item, runtime);
		}
	};
	let rt = new Petal.Runtime(false, rootScope, changeRouter, cargo);
	dollarObj.runtime = rt;

	// If it's a literal code line, skip the rest of this.
	let trimmedLine = parse.text.trim();
	if (trimmedLine[0] === ";") {
		let compiled = Petal.parseFromSource(trimmedLine.substr(1));
		let immediateInjections = {
			$: injections.$,
			$parse: injections.$parse,
			$player: injections.$player,
			$perms: injections.$perms,
			caller: dollarParseObj.player,
			this: null
		};
		let result: Petal.ExecuteResult;
		try {
			result = await rt.executeCodeAsync("<immediate>", compiled, immediateInjections, player.id, 100000);
		} catch (err) {
			formatPetalException(rt, player, err);
		}
		if (result) {
			console.log("Command took", result.stepsUsed, "steps");
			if (result.outOfSteps) {
				player.event(EventType.ScriptError, Date.now(), ["ERROR: Ran out of steps while running immediate command"]);
				return;
			}
			if (result.returnValue) {
				player.event(EventType.Output, Date.now(), ["Command returned: ", JSON.stringify(Petal.ObjectWrapper.Unwrap(result.returnValue))]);
			}
		}
		return;
	}

	let root = await world.getWob(1);
	let parserVerb = root.getVerb("$command");
	if (parserVerb) {
		let addr = parserVerb.address.copy();
		addr.thisValue = new WobWrapper(1);
		addr.injections = injections;
		let result: Petal.ExecuteResult;
		try {
			result = await rt.executeFunctionAsync(addr, [], dollarParseObj.player, 100000);
		} catch (err) {
			formatPetalException(rt, player, err);
		}
		if (result) {
			player.event(EventType.Debug, Date.now(), ["$command took ", result.stepsUsed, " steps"]);
			if (result.outOfSteps) {
				player.event(EventType.ScriptError, Date.now(), ["ERROR: Ran out of steps while running $command"]);
				return;
			}
			if (result.returnValue)
				return;

			if (parse.verb) {
				// Reset the runtime.
				rt = new Petal.Runtime(false, rootScope, changeRouter, cargo);
				dollarObj.runtime = rt;
			}
		}
	}

	// Did we actually get any text? We do this here instead of above $command handling, because
	// $command can make use of some things that we don't recognise as properly formatted commands.
	if (parse.failure) {
		handleFailure(parse, player);
		return;
	}

	// We'll only continue here if we actually found a verb.
	if (parse.verb) {
		// Set up a runtime. We'll install our runtime values from above, then call the verb code.
		let addr = parse.verb.address.copy();
		addr.thisValue = new WobWrapper(parse.verbObject.id);
		addr.injections = injections;
		let result: Petal.ExecuteResult;
		try {
			result = await rt.executeFunctionAsync(addr, [], dollarParseObj.player, 1000000);
		} catch (err) {
			formatPetalException(rt, player, err);
		}

		if (result) {
			player.event(EventType.Debug, Date.now(), [parse.verbName, " took ", result.stepsUsed, " steps"]);
			if (result.outOfSteps) {
				player.event(EventType.ScriptError, Date.now(), ["ERROR: Ran out of steps while running ", parse.verbName]);
				return;
			}
		}
	} else {
		handleFailure(parse, player);
	}
}
