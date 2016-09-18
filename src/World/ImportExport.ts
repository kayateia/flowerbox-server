/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import * as FsPromises from "../Async/FsPromises";
import * as CorePromises from "../Async/CorePromises";
import * as path from "path";
import { World } from "./World";
import { Wob, WobProperties } from "./Wob";
import { Utils } from "../Petal/Utils";
import { Perms, Security } from "./Security";
import { Property } from "./Property";
import * as Petal from "../Petal/All";
import { Verb } from "./Verb";

export class ImportExport {
	public static async Import(world: World, basePath: string) {
		const initFn: string = path.join(basePath, "InitWorld.json");
		const init: InitWob[] = JSON.parse((await FsPromises.readFile(initFn)).toString());

		for (let wobdef of init) {
			let wob = await world.createWob();
			for (let prop of Utils.GetPropertyNames(wobdef.properties)) {
				let value = wobdef.properties[prop];
				wob.setProperty(prop, new Property(Petal.ObjectWrapper.Wrap(value)));
			}
			if (wobdef.propertiesWithPerms) {
				for (let prop of Utils.GetPropertyNames(wobdef.propertiesWithPerms)) {
					let value = wobdef.propertiesWithPerms[prop];
					let perms: any = value.perms;
					if (perms)
						perms = Perms.parse(perms);
					wob.setProperty(prop, new Property(Petal.ObjectWrapper.Wrap(value.value), perms));
				}
			}
			if (wobdef.propertiesBinary) {
				for (let prop of Utils.GetPropertyNames(wobdef.propertiesBinary)) {
					let pv = wobdef.propertiesBinary[prop];
					let perms: any = pv.perms;
					if (perms)
						perms = Perms.parse(perms);
					let fn = path.join(basePath, pv.file);
					console.log("loading", fn, "-", pv.mime);
					let contents = await FsPromises.readFile(fn);
					wob.setProperty(prop, new Property(new Petal.PetalBlob(contents, pv.mime, pv.file), perms));
				}
			}

			if (wobdef.verbs) {
				for (let vinfo of wobdef.verbs) {
					let p = path.join(basePath, vinfo.fn);
					console.log("loading", p, "->", vinfo.name);
					let contents = (await FsPromises.readFile(p)).toString();
					let sigs: string[] = vinfo.sigs;
					wob.setVerbCode(vinfo.name, sigs, contents);
				}
			}

			// Does name resolution for referenced wobs.
			let findWob = async (inputWob: Wob, id: string | number): Promise<Wob> => {
				let wob: Wob;
				if (typeof(id) === "string") {
					if (id[0] === "@") {
						wob = (await world.getWobsByGlobalId([id.substr(1)]))[0];
					} else if (id === "self") {
						wob = inputWob;
					} else {
						throw new Error("Invalid string " + id + "to identify wob");
					}
				} else {
					wob = world.getCachedWob(id);
				}
				return wob;
			};

			if (wobdef.container) {
				let container: Wob = await findWob(wob, wobdef.container);
				wob.container = container.id;
				container.contents.push(wob.id);
			}
			if (wobdef.base) {
				let base: Wob = await findWob(wob, wobdef.base);
				wob.base = base.id;
			}
			if (wobdef.owner) {
				let owner: Wob = await findWob(wob, wobdef.owner);
				wob.owner = owner.id;
			}
			if (wobdef.group) {
				let group: Wob = await findWob(wob, wobdef.group);
				wob.group = group.id;
			}
			if (wobdef.perms)
				wob.perms = Perms.parse(wobdef.perms);
			else
				wob.perms = Security.GetDefaultWobPerms();
		}
	}

	public static async Export(world: World, basePath: string) {
		let top: number = world.nextId;
		let wobs: InitWob[] = [];

		// Returns a suitable reference for another wob within a wob. This will attempt
		// to make the most useful human-readable value rather than just using numbers.
		async function getIdForWob(currentWob: Wob, otherWobId: number): Promise<string | number> {
			if (otherWobId === undefined || otherWobId === 0)
				return undefined;

			let otherWob = await world.getWob(otherWobId);
			if (currentWob.id === otherWob.id)
				return "self";
			if (otherWob.getProperty(WobProperties.GlobalId))
				return "@" + otherWob.getProperty(WobProperties.GlobalId).value;
			return otherWob.id;
		}

		for (let i=1; i<top; ++i) {
			let wob = await world.getWob(i);
			if (!wob) {
				wobs.push(null);
				continue;
			}

			let initWob: InitWob = <any>{};

			// Intrinsic properties.
			initWob.base = await getIdForWob(wob, wob.base);
			initWob.container = await getIdForWob(wob, wob.container);
			initWob.owner = await getIdForWob(wob, wob.owner);
			initWob.group = await getIdForWob(wob, wob.group);
			initWob.perms = Perms.unparse(wob.perms);

			// Non-intrinsic properties. We split these into three types, depending on what needs to be stored.
			initWob.properties = {};
			initWob.propertiesWithPerms = {};
			initWob.propertiesBinary = {};
			let propNames: string[] = wob.getPropertyNames();
			for (let n of propNames) {
				let value = wob.getProperty(n);

				if (value.value instanceof Petal.PetalBlob) {
					let blob: Petal.PetalBlob = value.value;
					let ext;
					if (blob.mime === "image/jpeg")
						ext = ".jpg";
					else if (blob.mime === "image/png")
						ext = ".png";
					else if (blob.mime === "audio/mpeg3")
						ext = ".mp3";
					else if (blob.mime === "audio/m4a")
						ext = ".m4a";
					else
						ext = ".blob";
					let fn = wob.id + "-" + n + ext;
					await FsPromises.writeFile(path.join(basePath, fn), blob.data);
					initWob.propertiesBinary[n] = {
						file: fn,
						mime: blob.mime,
						perms: value.perms ? Perms.unparse(value.perms) : undefined
					};
				} else {
					if (value.perms) {
						initWob.propertiesWithPerms[n] = {
							value: Petal.ObjectWrapper.Unwrap(value.value),
							perms: Perms.unparse(value.perms)
						};
					} else {
						initWob.properties[n] = Petal.ObjectWrapper.Unwrap(value.value);
					}
				}
			}

			// And the verbs. These are stored in separate files.
			let verbNames = wob.getVerbNames();
			initWob.verbs = [];
			for (let n of verbNames) {
				let verb = wob.getVerb(n);

				// This is probably not sufficient sanitization, but it covers the most common case.
				let fn = wob.id + "-" + n.replace("$", "_") + ".petal";

				await FsPromises.writeFile(path.join(basePath, fn), verb.code);

				initWob.verbs.push({
					fn: fn,
					name: n,
					sigs: verb.signatureStrings,
					perms: verb.perms ? Perms.unparse(verb.perms) : undefined
				});
			}

			wobs.push(initWob);
		}

		let outFn: string = path.join(basePath, "InitWorld.json");
		await FsPromises.writeFile(outFn, JSON.stringify(wobs, null, 4));
	}
}

///////////////////////////////////////////////////////////////////////////
// The following interfaces define the JSON format of the InitWorld data.
// The intent of this file is that it's relatively hand-editable.

interface InitVerb {
	fn: string;
	name: string;
	sigs: string[];

	// Should be a permission string, e.g. "rwx:rx:rx".
	perms?: string;
}

interface InitProperties {
	[index: string]: any
}

interface InitPropertyWithPerms {
	value: any;

	// Should be a permission string, e.g. "rw:r:r".
	perms: string;
}

interface InitPropertiesWithPerms {
	[index: string]: InitPropertyWithPerms
}

interface InitPropertyBinary {
	file: string;
	mime: string;

	// Should be a permission string, e.g. "rw:r:r".
	perms: string;
}

interface InitPropertiesBinary {
	[index: string]: InitPropertyBinary
}

interface InitWob {
	properties: InitProperties;
	propertiesWithPerms?: InitPropertiesWithPerms;
	propertiesBinary?: InitPropertiesBinary;

	// Should be a globalid if possible.
	container?: string | number;

	// Should be a globalid if possible.
	base?: string | number;

	// Should be a globalid if possible.
	owner?: string | number;

	// Should be a globalid if possible.
	group?: string | number;

	// Should be a permission string, e.g. "rw:r:r".
	perms: string;

	verbs: InitVerb[];
}
