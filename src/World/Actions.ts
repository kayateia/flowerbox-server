/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { Wob, WobProperties, WobRef, EventType } from "./Wob";
import { World } from "./World";
import { Security } from "./Security";
import { NotationWrapper } from "./Execution/NotationWrapper";
import { WobReferenceException } from "./Exceptions";
import { Notation } from "./Notation";

// This class contains a lot of utility methods to do some actions common to both the
// Petal/Execution side as well as the API side.
export class Actions {
	// Moves the specified wob into the other wob. This also takes care of permissions
	// checks, event stream notifications, and announcements in each location.
	public static async Move(world: World, srcId: number, intoId: number): Promise<any> {
		// FIXME: Need to ask the wob itself if it's okay to move it.
		let wob: Wob = await world.getWob(srcId);
		let oldLocation = await world.getWob(wob.container);
		let newLocation = await world.getWob(intoId);

		let playerBase: Wob = await world.getWobByGlobalId("player");
		if (!playerBase)
			throw new WobReferenceException("Can't find the @player object", 0);

		async function notate(wob: Wob): Promise<NotationWrapper> {
			let nameProp = await wob.getPropertyI(WobProperties.Name, world);
			let name: string;
			if (!nameProp)
				name = "#" + wob.id;
			else
				name = nameProp.value.value;
			return new NotationWrapper(new Notation(name, new WobRef(wob.id)));
		}

		let notations = await Promise.all([wob, oldLocation, newLocation].map(async w => notate(w)));

		// Notify all the player objects in the old room that something is moving.
		await Promise.all(oldLocation.contents.map(async c => {
			if (c === wob.id)
				return;
			let cwob = await world.getWob(c);
			if (cwob && await cwob.instanceOf(playerBase.id, world)) {
				cwob.event(EventType.MoveNotification, Date.now(), notations);
			}
		}));

		await world.moveWob(wob.id, newLocation.id);

		// Notify all the player objects in the new room (including the moved object, if
		// it's a player) that something is moving.
		await Promise.all(newLocation.contents.map(async c => {
			let cwob = await world.getWob(c);
			if (cwob && await cwob.instanceOf(playerBase.id, world)) {
				cwob.event(EventType.MoveNotification, Date.now(), notations);
			}
		}));
	}
}
