/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

// This is what will go inside the encrypted bearer tokens we hand out at login.
export class Token {
	constructor(username: string, wobId: number, pwhash: string, admin: boolean) {
		this.username = username;
		this.wobId = wobId;
		this.pwhash = pwhash;
		this.creationTime = Date.now();
		this.admin = admin;
	}

	public username: string;
	public wobId: number;
	public pwhash: string;
	public creationTime: number;
	public admin: boolean;
}
