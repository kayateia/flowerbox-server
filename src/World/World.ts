/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { WobReferenceException } from "./Exceptions";
import { Wob, WobProperties } from "./Wob";
import { Verb } from "./Verb";
import * as Strings from "../Strings";

// Zaa Warudo
export class World {
	constructor() {
		this._nextId = 1;
		this._wobCache = new Map<number, Wob>();

		// Create a small in-world "game world" to test with.
		this.createDefault();
	}

	public createDefault(): void {
		// This will create #1. It is the root object.
		let wob1 = this.createWob();
		wob1.setProperty(WobProperties.Name, "Zaa Warudo");
		wob1.setProperty(WobProperties.GlobalId, "world");
		wob1.setProperty(WobProperties.Description, "This is an endless void existing outside of all other reality.");
		wob1.setVerb("$command", new Verb("$command",
		"function $command() {\
			var text = $env.text;\
			if (text.startsWith('say ')) {\
				$.log('Saying', text.substr(4));\
				return true;\
			} else\
				return false;\
		}"));
		wob1.setVerb("look", new Verb("look",
		"//# look none at self\n//# look self\n\
		function verb_look() {\
			var target;\
			if ($env.direct)\
				target = $env.direct;\
			else if ($env.indirect)\
				target = $env.indirect;\
			else {\
				$.log('Dont know what youre looking at!');\
				return;\
			}\
			$.log('looking at', target.name);\
			$.log(target.desc);\
		}"));

		let wobPlayer = this.createWob();
		wobPlayer.base = wob1.id;
		wobPlayer.setProperty(WobProperties.Name, "Player");
		wobPlayer.setProperty(WobProperties.Description, "A blank shape that says MY BURAZAA on it");
		wobPlayer.setVerb("poke", new Verb("poke", "//# poke self\nfunction verb_poke() { $.log('poked!'); }"));
		wob1.addContent(wobPlayer);

		let wobKaya = this.createWob();
		wobKaya.base = wobPlayer.id;
		wobKaya.setProperty(WobProperties.Name, "Kayateia");
		wobKaya.setProperty(WobProperties.Description, "A hacker girl stares at you from a hooded gaze...");
		wob1.addContent(wobKaya);

		let wobRoom = this.createWob();
		wobRoom.base = wob1.id;
		wobRoom.setProperty(WobProperties.Name, "Room");
		wobRoom.setProperty(WobProperties.Description, "A featureless room");
		wob1.addContent(wobRoom);

		let wobHammer = this.createWob();
		wobHammer.base = wob1.id;
		wobHammer.setProperty(WobProperties.Name, "Hammer");
		wob1.addContent(wobHammer);
		wobHammer.setVerb("throw", new Verb("throw", "//# throw self at any\nfunction verb_throw() {}"));
		wobHammer.setVerb("use", new Verb("use", "//# use self on any\nfunction verb_use() {}"));

		let wobTeacup = this.createWob();
		wobTeacup.base = wob1.id;
		wobTeacup.setProperty(WobProperties.Name, "Teacup");
		wob1.addContent(wobTeacup);
		wobTeacup.setVerb("drink", new Verb("drink", "//# drink none from self\nfunction verb_drink() {}"));
		wobTeacup.setVerb("drop", new Verb("drop", "//# drop self\nfunction verb_drop() {}"));

		let wobDog = this.createWob();
		wobDog.base = wob1.id;
		wobDog.setProperty(WobProperties.Name, "Dog who was put in a kennel");
		wob1.addContent(wobDog);
		wobDog.setVerb("release", new Verb("release", "//# release self\nfunction verb_release() { $.log('Thank you for releasing me,', $env.caller.name, '!'); }"));
		wobDog.setVerb("put", new Verb("put", "//# put self in any\nfunction verb_put() { $.log('Noooes,', $env.caller.name, ', why did you put me in the',$env.indirect.name,'?'); }"));

		let wobPerson = this.createWob();
		wobPerson.base = wob1.id;
		wobPerson.setProperty(WobProperties.Name, "Human person");
		wobPerson.setProperty(WobProperties.GlobalId, "human");
		wobRoom.addContent(wobPerson);
		wobPerson.setVerb("pet", new Verb("pet", "//# pet self\nfunction verb_pet() { $.log('Ahhh!!'); }"));
	}

	public createWob(container?: number): Wob {
		// Make the object.
		let wob = new Wob(this._nextId++);
		this._wobCache.set(wob.id, wob);

		// If there's a container specified, place the object into the container.
		if (container) {
			let containerWob: Wob = this._wobCache[container];
			if (!containerWob)
				throw new WobReferenceException("Can't find container", container);

			containerWob.addContent(wob);
		}

		return wob;
	}

	public async getWob(id: number): Promise<Wob> {
		return new Promise<Wob>((success, fail) => {
			// For now, we only support the in-memory cache.
			success(this._wobCache.get(id));
		});
	}

	// Eventually this will be the one to prefer using if you need more than one object,
	// because it can optimize its SQL queries as needed.
	public getWobs(ids: number[]): Promise<Wob[]> {
		return new Promise<Wob[]>((success, fail) => {
			success(ids.map((id) => this._wobCache.get(id)));
		});
	}

	public getWobsByGlobalId(ids: string[]): Promise<Wob[]> {
		return new Promise<Wob[]>((success, fail) => {
			success([...this._wobCache.values()].filter((w) => Strings.caseIn(w.getProperty(WobProperties.GlobalId), ids)));
		});
	}

	private _nextId: number;
	private _wobCache: Map<number, Wob>;
}
