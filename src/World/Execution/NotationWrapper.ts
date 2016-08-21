/*
	Flowerbox
	Copyright (C) 2016 Dove, Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import * as Petal from "../../Petal/All";
import { Notation } from "../Notation";
import * as Persistence from "../../Utils/Persistence";

// Wraps a notation for passing around in Petal scripts. These are opaque
// objects and you can't do anything with them but pass them around.
export class NotationWrapper implements Petal.IObject {
	constructor(notation: Notation) {
		this.notation = notation;
	}

	public getAccessor(index: any): any {
		return Petal.LValue.MakeReadOnly(null);
	}

	public toString(): string {
		return "[Notation: " + this.notation.text + "]";
	}

	public persist(): any {
		return this.notation.persist();
	}

	public static Unpersist(obj: any): NotationWrapper {
		return new NotationWrapper(Notation.Unpersist(obj));
	}

	public notation: Notation;
}
Persistence.registerType(NotationWrapper);
