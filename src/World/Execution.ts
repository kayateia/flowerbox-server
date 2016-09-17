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

export function formatPetalException(runtime: Petal.Runtime, err: any): string[] {
	let output;

	// Try to pull the official Petal stack off the error, if it has one. If not,
	// go to the runtime and try to pull one anyway.
	if (err.petalStack)
		output = [err.cause, " ", JSON.stringify(err.petalStack)];
	else if (runtime)
		output = [err.toString(), " ", err.stack, " ", JSON.stringify(runtime.getStackTrace())];
	else
		output = [err.toString(), " ", err.stack];

	return output;
}

function displayPetalException(runtime: Petal.Runtime, player: Wob, err: any): void {
	let output = formatPetalException(runtime, err);

	if (player)
		player.event(EventType.ScriptError, Date.now(), output);
	else
		console.log("Uncaught non-player error:", output);
	// FIXME: Do something better here.
}

// An environment for a function call in a verb context.
class EnvironmentSetup {
	// The variable injections that will be inserted into the called method.
	injections: any;

	// Context cargo passed along for property accessors later.
	cargo: AccessorCargo;

	// The $ object.
	dollarObj: DollarObject;
	dollar: Petal.IObject;

	// The $parse object.
	dollarParseObj: DollarParse;
	dollarParse: Petal.IObject;

	// The $player object.
	playerObj: Wob;
	player: Petal.IObject;

	rootScope: RootScope;

	changeRouter: Petal.IChangeNotification;

	changeTester: Petal.ICanChangeNotification;

	runtime: Petal.Runtime;

	// Sets up an environment for a function call in a verb context. Parse and player may be null.
	public static Setup(parse: ParseResult, player: Wob, playerIsAdmin: boolean, world: World): EnvironmentSetup {
		// Get the environment ready.
		let injections: any = {};
		let cargo = new AccessorCargo(world, injections, player, playerIsAdmin);

		let dollarObj = new DollarObject(world, injections);
		let dollar = Petal.ObjectWrapper.WrapGeneric(dollarObj, DollarObject.Members, false);
		injections.$ = dollar;

		let dollarParseObj: DollarParse;
		let dollarParse: Petal.IObject;
		if (parse) {
			dollarParseObj = new DollarParse(parse, player, world, injections);
			dollarParse = Petal.ObjectWrapper.WrapGeneric(dollarParseObj, DollarParse.Members, false);
			injections.$parse = dollarParse;
		}

		let playerWrapper: Petal.IObject;
		if (player) {
			playerWrapper = new WobWrapper(player.id);
			injections.$player = playerWrapper;
		}

		let perms = Petal.ObjectWrapper.WrapGeneric(Perms, [ "r", "w", "x", "s", "group", "others" ]);
		injections.$perms = perms;

		// Check for a global command handler on #1. If it exists, we'll call that first.
		let rootScope = new RootScope(world, injections);
		let changeRouter = async (item: Petal.IPetalWrapper, runtime: Petal.Runtime) => {
			if (item.tag && item.tag instanceof WobPropertyTag) {
				let ww: WobPropertyTag = item.tag;
				await ww.wob.changeNotification(item, runtime);
			}
		};
		let changeTester = async (item: Petal.IPetalWrapper, runtime: Petal.Runtime) => {
			if (item.tag && item.tag instanceof WobPropertyTag) {
				let ww: WobPropertyTag = item.tag;
				return await ww.wob.canChange(item, runtime);
			}
		};
		let rt = new Petal.Runtime(false, rootScope, changeRouter, changeTester, cargo);
		dollarObj.runtime = rt;

		return {
			injections: injections,
			cargo: cargo,
			dollarObj: dollarObj,
			dollar: dollar,
			dollarParseObj: dollarParseObj,
			dollarParse: dollarParse,
			playerObj: player,
			player: playerWrapper,
			rootScope: rootScope,
			changeRouter: changeRouter,
			changeTester: changeTester,
			runtime: rt
		};
	}
}

// Executes an arbitrary function in the context of a standard verb execution. Parse and player
// may be null if they are not available. Errors thrown in the runtime *will* bubble out.
export async function executeFunction(parse: ParseResult, player: Wob, playerIsAdmin: boolean, world: World,
		func: Petal.Address, thisValue: any): Promise<Petal.ExecuteResult> {
	// Get the environment ready.
	let env: EnvironmentSetup = EnvironmentSetup.Setup(parse, player, playerIsAdmin, world);

	let addr = func.copy();
	if (thisValue instanceof Wob)
		thisValue = new WobWrapper(thisValue.id);
	addr.thisValue = thisValue;
	addr.injections = env.injections;

	return await env.runtime.executeFunctionAsync(addr, [], env.player, 1000000);
}

// Executes a verb in the context of a standard verb execution.
async function executeVerbInner(funcName: string, func: Petal.Address, thisValue: any, env: EnvironmentSetup): Promise<Petal.ExecuteResult> {
	let addr = func.copy();
	if (thisValue instanceof Wob)
		thisValue = new WobWrapper(thisValue.id);
	addr.thisValue = thisValue;
	addr.injections = env.injections;

	let result: Petal.ExecuteResult;
	try {
		let player: Wob;
		result = await env.runtime.executeFunctionAsync(addr, [], env.player, 1000000);
	} catch (err) {
		displayPetalException(env.runtime, env.playerObj, err);
	}
	if (result) {
		env.playerObj.event(EventType.Debug, Date.now(), [funcName, " took ", result.stepsUsed, " steps"]);
		if (result.outOfSteps) {
			env.playerObj.event(EventType.ScriptError, Date.now(), ["ERROR: Ran out of steps while running ", funcName]);
			return null;
		}
	}
	return result;
}

// Takes the result of a parse and executes it as necessary.
export async function executeResult(parse: ParseResult, player: Wob, playerIsAdmin: boolean, world: World): Promise<void> {
	// Get the environment ready.
	let env: EnvironmentSetup = EnvironmentSetup.Setup(parse, player, playerIsAdmin, world);

	// If it's a literal code line, skip the rest of this.
	let trimmedLine = parse.text.trim();
	if (trimmedLine[0] === ";") {
		let compiled = Petal.parseFromSource(trimmedLine.substr(1));
		let immediateInjections = {
			$: env.injections.$,
			$parse: env.injections.$parse,
			$player: env.injections.$player,
			$perms: env.injections.$perms,
			caller: env.dollarParseObj.player,
			this: null
		};
		let result: Petal.ExecuteResult;
		try {
			result = await env.runtime.executeCodeAsync("<immediate>", compiled, immediateInjections, player.id, 100000);
		} catch (err) {
			displayPetalException(env.runtime, player, err);
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
		let result: Petal.ExecuteResult = await executeVerbInner("$command", parserVerb.address, new WobWrapper(1), env);
		if (result) {
			if (result.returnValue)
				return;

			if (parse.verb) {
				// Reset the runtime.
				env = EnvironmentSetup.Setup(parse, player, playerIsAdmin, world);
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
		let result: Petal.ExecuteResult = await executeVerbInner(parse.verb.word, parse.verb.address,
			new WobWrapper(parse.verbObject.id), env);
	} else {
		handleFailure(parse, player);
	}
}
