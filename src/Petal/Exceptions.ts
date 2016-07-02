// Used from within callbacks to cause the interpreter to suspend its execution and return.
export class SuspendException {
}

// Reports some sort of problem with running the code.
export class RuntimeException {
	constructor(cause: string, value?: any) {
		this.cause = cause;
		this.value = value;
	}

	public cause: string;
	public value: any;
}

// Reports a problem with parsing the input script.
export class ParseException {
	constructor(cause: string, parseTree: any) {
		this.cause = cause;
		this.parseTree = parseTree;
	}

	public cause: string;
	public parseTree: any;
}
