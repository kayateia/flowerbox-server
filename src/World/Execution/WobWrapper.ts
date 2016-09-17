/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { Wob, WobProperties } from "../Wob";
import { World } from "../World";
import { WobReferenceException, WobOperationException, SecurityException } from "../Exceptions";
import * as Petal from "../../Petal/All";
import { Perms, Security } from "../Security";
import * as Persistence from "../../Utils/Persistence";
import * as Strings from "../../Utils/Strings";
import { Utils } from "../Utils";
import { Actions } from "../Actions";

export class WobPropertyTag {
	constructor(ww: WobWrapper, property: string) {
		this.wob = ww;
		this.property = property;
	}

	public wob: WobWrapper;
	public property: string;
}

// This is passed along to WobWrapper accesses.
export class AccessorCargo {
	public world: World;
	public injections: any;
	public player: Wob;
	public playerIsAdmin: boolean;

	constructor(world: World, injections: any, player: Wob, playerIsAdmin: boolean) {
		this.world = world;
		this.injections = injections;
		this.player = player;
		this.playerIsAdmin = playerIsAdmin;
	}
}

// Wraps a Wob for use within Petal.
export class WobWrapper implements Petal.IObject {
	constructor(id: number) {
		this._id = id;
	}

	public equalTo(other: any, cargo: AccessorCargo): any {
		if (other instanceof WobWrapper)
			return this._id === other._id;
		else
			return false;
	}

	public async instanceOf(other: any, cargo: AccessorCargo): Promise<boolean> {
		let us = this._id;
		let them = other;
		if (them instanceof WobWrapper)
			them = them._id;

		// Load our wob.
		let uswob = await cargo.world.getWob(us);

		return await uswob.instanceOf(them, cargo.world);
	}

	public getAccessor(index: any, cargo: AccessorCargo): any {
		if (typeof(index) !== "string")
			throw new WobOperationException("Can't access non-string members on Wobs", []);

		if (index === "id") {
			return new Petal.LValue("Wob.id", () => {
				return this._id;
			}, () => {
				throw new WobOperationException("Can't set the id of objects", []);
			}, this);
		}

		if (index === "location") {
			return new Petal.LValue("Wob.location", async () => {
				let wob = await cargo.world.getWob(this._id);
				return new WobWrapper(wob.container);
			}, () => {
				throw new WobOperationException("Can't set the location of objects (use $.move)", []);
			}, this);
		}
		if (index === "base") {
			return new Petal.LValue("Wob.base", async () => {
				let wob = await cargo.world.getWob(this._id);
				return new WobWrapper(wob.base);
			}, async (rt, value: any) => {
				if (value instanceof WobWrapper)
					value = value.id;
				if (typeof(value) !== "number" || value < 1)
					throw new WobReferenceException("Invalid value for base wob ID", value);

				let wob = await cargo.world.getWob(this._id);
				wob.base = value;
			}, this);
		}
		if (index === "contents") {
			return new Petal.LValue("Wob.contents", async (runtime: Petal.Runtime) => {
				let wob = await cargo.world.getWob(this._id);
				return new Petal.PetalArray(wob.contents.map(w => new WobWrapper(w)));
			}, () => {
				throw new WobOperationException("Can't set the contents of objects (use $.move)", []);
			}, this);
		}

		if (index === "$event") {
			return new Petal.LValue("Wob.$event", async(runtime: Petal.Runtime) => {
				let wob = await cargo.world.getWob(this._id);
				return Petal.Address.Function((type: string, timestamp: number, body: any[]) => {
					wob.event(type, timestamp, body);
				});
			}, () => {
				throw new WobOperationException("Can't set $event on a wob", []);
			}, this);
		}

		if (index === "properties") {
			return new Petal.LValue("Wob.properties", async (runtime: Petal.Runtime) => {
				let wob = await cargo.world.getWob(this._id);

				if (!(cargo.player && runtime.currentSecurityContext === cargo.player.id && cargo.playerIsAdmin)
						&& !Security.CheckGetWobProperties(wob, runtime.currentSecurityContext)) {
					throw new SecurityException("Access denied reading wob", "properties");
				}

				let props = await wob.getPropertyNamesI(cargo.world);
				return Petal.ObjectWrapper.Wrap(props.map(wv => ({ wobid: wv.wob, name: wv.value })));
			}, () => {
				throw new WobOperationException("Can't set 'properties' on a wob", []);
			}, this);
		}

		if (index === "verbs") {
			return new Petal.LValue("Wob.verbs", async (runtime: Petal.Runtime) => {
				let wob = await cargo.world.getWob(this._id);

				if (!(cargo.player && runtime.currentSecurityContext === cargo.player.id && cargo.playerIsAdmin)
						&& !Security.CheckGetWobVerbs(wob, runtime.currentSecurityContext)) {
					throw new SecurityException("Access denied reading wob", "verbs");
				}

				let verbs = await wob.getVerbNamesI(cargo.world);
				return Petal.ObjectWrapper.Wrap(verbs.map(wv => ({ wobid: wv.wob, name: wv.value })));
			}, () => {
				throw new WobOperationException("Can't set 'verbs' on a wob", []);
			}, this);
		}

		return (async () => {
			let wob = await cargo.world.getWob(this._id);
			let member: string = index;
			let props: string[] = (await wob.getPropertyNamesI(cargo.world)).map(wv => wv.value);
			let verbs: string[] = (await wob.getVerbNamesI(cargo.world)).map(wv => wv.value);

			// Check verbs first, but if it's not there, assume it's a property so that new properties can be written.
			if (Strings.caseIn(member, verbs)) {
				let verb = await wob.getVerbI(member, cargo.world);
				let verbSrc = verb ? (await cargo.world.getWob(verb.wob)) : null;
				return new Petal.LValue("Wob." + member, (runtime: Petal.Runtime) => {
					if (!verb) {
						// FIXME: Is this a security info leak?
						return null;
					}

					if (!(cargo.player && runtime.currentSecurityContext === cargo.player.id && cargo.playerIsAdmin)
							&& !Security.CheckVerb(verbSrc, member, runtime.currentSecurityContext, Perms.x))
						throw new SecurityException("Access denied executing verb", member);

					let addr = verb.value.address.copy();
					addr.thisValue = this;
					addr.injections = cargo.injections;
					return addr;
				}, (runtime: Petal.Runtime, value: any) => {
					throw new WobOperationException("Can't set new verbs right now", []);
				}, this);
			} else /*if (Strings.caseIn(member, props))*/ {
				let prop = await wob.getPropertyI(member, cargo.world);
				let propSrc = prop ? (await cargo.world.getWob(prop.wob)) : null;
				let stickySrc = prop ? (await Actions.GetStickyParent(propSrc, member, cargo.world)) : null;
				return new Petal.LValue("Wob." + member, (runtime: Petal.Runtime) => {
					if (!prop) {
						// FIXME: Is this a security info leak?
						return null;
					}

					if (!(cargo.player && runtime.currentSecurityContext === cargo.player.id && cargo.playerIsAdmin)
							&& !Security.CheckPropertyRead(stickySrc ? stickySrc : propSrc, member, runtime.currentSecurityContext))
						throw new SecurityException("Access denied reading property", member);

					if (prop && prop.wob !== this._id) {
						let rv = Utils.Duplicate(prop.value.value);
						Petal.ObjectWrapper.SetTag(rv, new WobPropertyTag(this, member));
						return rv;
					} else {
						if (prop) {
							Petal.ObjectWrapper.SetTag(prop.value.value, new WobPropertyTag(this, member));
							return prop.value.value;
						} else
							return null;
					}
				}, (runtime: Petal.Runtime, value: any) => {
					if (!(cargo.player && runtime.currentSecurityContext === cargo.player.id && cargo.playerIsAdmin)) {
						if (!prop) {
							if (!Security.CheckSetWobProperties(wob, runtime.currentSecurityContext))
								throw new SecurityException("Access denied adding properties", member);
						} else {
							if (!Security.CheckPropertyWrite(stickySrc ? stickySrc : wob, member, runtime.currentSecurityContext))
								throw new SecurityException("Access denied setting property", member);
						}
					}

					Petal.ObjectWrapper.SetTag(value, new WobPropertyTag(this, member));
					wob.setPropertyKeepingPerms(member, value);
				}, this);
			}
		})();
	}

	public async canChange(item: Petal.IPetalWrapper, runtime: Petal.Runtime): Promise<boolean> {
		let cargo: AccessorCargo = runtime.accessorCargo;
		if (cargo.player && runtime.currentSecurityContext === cargo.player.id && cargo.playerIsAdmin)
			return true;

		let wob = await cargo.world.getWob(this._id);
		if (wob) {
			let name = (<WobPropertyTag>item.tag).property;
			let prop = await wob.getPropertyI(name, cargo.world);
			if (!prop) {
				return Security.CheckSetWobProperties(wob, runtime.currentSecurityContext);
			}
			let propSrc = await cargo.world.getWob(prop.wob);
			let stickySrc = await Actions.GetStickyParent(propSrc, name, cargo.world);

			return Security.CheckPropertyWrite(stickySrc ? stickySrc : wob, name, runtime.currentSecurityContext);
		} else
			return false;
	}

	public async changeNotification(item: Petal.IPetalWrapper, runtime: Petal.Runtime): Promise<void> {
		let cargo: AccessorCargo = runtime.accessorCargo;
		let wob = await cargo.world.getWob(this._id);
		if (wob) {
			// This may not be necessary, but:
			// a) it sets the dirty flag for us,
			// b) if this came to us through inheritance, it will set the local copy.
			wob.setPropertyKeepingPerms(name, item);
		}
	}

	public persist(): any {
		return { id: this._id };
	}

	public static Unpersist(obj: any): any {
		return new WobWrapper(obj.id);
	}

	public get id(): number {
		return this._id;
	}

	private _id: number;
}
Persistence.registerType(WobWrapper);
