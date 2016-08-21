/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { World } from "../World";
import { WobWrapper } from "./WobWrapper";
import { WobReferenceException } from "../Exceptions";
import { Wob, WobProperties, WobRef } from "../Wob";
import { PropertyRef } from "../Property";
import { Notation } from "../Notation";
import { NotationWrapper } from "./NotationWrapper";
import { Actions } from "../Actions";
import * as Petal from "../../Petal/All";

// Represents the $ object within the game, which represents the interface to the game itself.
export class DollarObject {
	constructor(world: World, injections: any) {
		this._world = world;
		this._injections = injections;
	}

	public log(): void {
		let args = [];
		for (let i=0; i<arguments.length; ++i)
			args.push(arguments[i]);
		console.log(">>>", ...args);
	}

	public logArray(arr: any[]): void {
		console.log(">>>", ...arr);
	}

	public timestamp(): number {
		return Date.now();
	}

	public async get(objId: any): Promise<WobWrapper> {
		if (typeof(objId) === "number") {
			let objNum: number = objId;
			return new WobWrapper(objNum);
		} else if (typeof(objId) === "string") {
			let objStr: string = objId;
			if (objStr.startsWith("@")) {
				let wobs = await this._world.getWobsByGlobalId([objStr.substr(1)]);
				if (wobs && wobs.length)
					return new WobWrapper(wobs[0].id);
				else
					return null;
			} else if (objStr.startsWith("/")) {
				return null;
			} else {
				return null;
			}
		} else
			return null;
	}

	public async move(objOrId: any /*WobWrapper | number*/, intoOrId: any /*WobWrapper | number*/): Promise<void> {
		if (!objOrId || !intoOrId)
			throw new WobReferenceException("Received a null wob in move()", 0);

		if (objOrId instanceof WobWrapper)
			objOrId = objOrId.id;
		if (intoOrId instanceof WobWrapper)
			intoOrId = intoOrId.id;

		if (typeof(objOrId) !== "number" || typeof(intoOrId) !== "number")
			throw new WobReferenceException("Received a non-wob object in move()", 0);

		await Actions.Move(this._world, objOrId, intoOrId);
	}

	public async contents(objOrId: any /*WobWrapper | number*/): Promise<WobWrapper[]> {
		if (!objOrId)
			throw new WobReferenceException("Received a null wob in contents()", 0);

		let wob;
		if (typeof(objOrId) === "number")
			wob = await this._world.getWob(objOrId);
		if (objOrId instanceof WobWrapper)
			wob = await this._world.getWob(objOrId.id);

		if (!wob)
			throw new WobReferenceException("Received a non-wob object in contents()", 0);

		return wob.contents.map(w => new WobWrapper(w));
	}

	public async create(intoOrId: any /*WobWrapper | number*/): Promise<WobWrapper> {
		if (!intoOrId)
			throw new WobReferenceException("Received a null wob in create()", 0);

		if (intoOrId instanceof WobWrapper)
			intoOrId = intoOrId.id;

		if (typeof(intoOrId) !== "number")
			throw new WobReferenceException("Received a non-wob object in create()", 0);

		// Create the new object and default to a generic, baseless object.
		let newWob = await this._world.createWob(intoOrId);
		newWob.base = 1;

		// Also default to the ownership being the object who created it.
		newWob.owner = this._runtime.currentSecurityContext;

		return new WobWrapper(newWob.id);
	}

	public async notate(text: any, notation: any, property?: string): Promise<any> {
		// Allow users to pass in only a wob and get a notation.
		if (text instanceof WobWrapper) {
			notation = text;
			let wob = await this._world.getWob(notation.id);
			text = await wob.getPropertyI(WobProperties.Name, this._world);
			if (text)
				text = text.value.value;
		}

		if (typeof(text) !== "string") {
			// Don't think this is quite the right exception...
			throw new WobReferenceException("Received a non-string for notation", 0);
		}

		// Try to convert objects back out of their Petal wrappers and such, if possible.
		if (notation instanceof WobWrapper)
			notation = new WobRef(notation.id);

		// If they passed a property, too, then turn this into a PropertyRef.
		if (property)
			notation = new PropertyRef(notation.id, property);

		return new NotationWrapper(new Notation(text, notation));
	}

	public static Members: string[] = [
		"log", "logArray", "timestamp", "get", "move", "contents", "create", "notate"
	];

	// Each time a new Runtime is created to deal with this object, set this value so we
	// have it to use in our methods.
	//
	// It would've been better to have this passed down into the methods, but then we'd have
	// to do the whole getAccessor thing here, and that's even uglier.
	public set runtime(runtime: Petal.Runtime) {
		this._runtime = runtime;
	}

	private _world: World;
	private _injections: any;
	private _runtime: Petal.Runtime;
}
