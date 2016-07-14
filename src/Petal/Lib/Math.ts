/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { ConstScope } from "../Scopes/ConstScope";
import { ObjectWrapper } from "../Objects";

var mathObject = {
	random: Math.random,
	floor: Math.floor
};

export function registerAll(scope: ConstScope): void {
	scope.setConst("Math", ObjectWrapper.WrapGeneric(mathObject, ["random", "floor"]));
}
