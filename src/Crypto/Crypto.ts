/*
	Flowerbox
	Copyright (C) 2016 Kayateia

	LifeStream - Instant Photo Sharing
	Copyright (C) 2014-2016 Kayateia

	For license info, please see notes/gpl-3.0.txt under the project root.
 */

import * as crypto from "crypto";

const config = require("../../config");

export function hash(str: string): string {
	let shasum = crypto.createHash("sha1");
	shasum.update(str);
	return shasum.digest("hex");
}

export function encryptText(text: string): string {
	let cipher = crypto.createCipher("aes-256-ctr", config.tokenPassword);
	let crypted = cipher.update(text, "utf8", "hex");
	crypted += cipher.final("hex");
	return crypted;
}

export function decryptText(hex: string): string {
	let cipher = crypto.createDecipher("aes-256-ctr", config.tokenPassword);
	let dec = cipher.update(hex, "hex", "utf8");
	dec += cipher.final("utf8");
	return dec;
}

export function encryptJson(json: any): string {
	return encryptText(JSON.stringify(json));
}

export function decryptJson(hex: string): any {
	return JSON.parse(decryptText(hex));
}
