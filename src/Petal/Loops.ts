/*
	Flowerbox
	Copyright (C) 2016 Kayateia
	For license info, please see notes/gpl-3.0.txt under the project root.
*/

import { Step, Runtime } from "./Runtime";

export class Loops {
	public static PushMarker(runtime: Runtime, type: string): void {
		runtime.pushAction(Step.Nonce(type + " loop marker"));
	}

	public static UnwindCurrent(runtime: Runtime, type: string): void {
		runtime.popActionWhile((s: Step) => s.name() !== type + " loop marker");
		runtime.popAction();
	}

	public static Iteration = "Iteration";
	public static Outside = "Outside";
}
