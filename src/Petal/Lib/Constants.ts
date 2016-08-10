/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { ConstScope } from "../Scopes/ConstScope";

export function registerAll(scope: ConstScope): void {
	scope.setConst("undefined", undefined);
	scope.setConst("null", null);
}
