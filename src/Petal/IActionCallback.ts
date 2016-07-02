/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

export interface IActionCallback {
	// This should really be Runtime, but Runtime itself uses this type.
	(any): void
}
