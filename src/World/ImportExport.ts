/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import * as FsPromises from "../Async/FsPromises";
import * as CorePromises from "../Async/CorePromises";
import * as path from "path";
import { World } from "./World";
import { Wob } from "./Wob";
import { Utils } from "../Petal/Utils";
import { Perms } from "./Security";
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
					let fn = path.join(basePath, pv.file);
					console.log("loading", fn, "-", pv.mime);
					let contents = await FsPromises.readFile(fn);
					wob.setProperty(prop, new Property(new Petal.PetalBlob(contents, pv.mime, pv.file)));
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
			let findWob = async (inputWob: Wob, id: any): Promise<Wob> => {
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
				wob.perms = Perms.parse("rw-r--r--");
		}
	}
}

///////////////////////////////////////////////////////////////////////////
// The following interfaces define the JSON format of the InitWorld data.
// The intent of this file is that it's relatively hand-editable.

interface InitVerb {
	fn: string;
	name: string;
	sigs: string[];

	// Should be a permission string, e.g. "rwxr-xr-x".
	perms?: string;
}

interface InitProperties {
	[index: string]: any
}

interface InitPropertyWithPerms {
	value: any;

	// Should be a permission string, e.g. "rw-r--r--".
	perms: string;
}

interface InitPropertiesWithPerms {
	[index: string]: InitPropertyWithPerms
}

interface InitPropertyBinary {
	file: string;
	mime: string;
}

interface InitPropertiesBinary {
	[index: string]: InitPropertyBinary
}

interface InitWob {
	properties: InitProperties;
	propertiesWithPerms?: InitPropertiesWithPerms;
	propertiesBinary?: InitPropertiesBinary;

	// Should be a globalid if possible.
	container?: string;

	// Should be a globalid if possible.
	base?: string;

	// Should be a globalid if possible.
	owner?: string;

	// Should be a globalid if possible.
	group?: string;

	// Should be a permission string, e.g. "rw-r--r--".
	perms: string;

	verbs: InitVerb[];
}
