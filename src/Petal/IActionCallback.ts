export interface IActionCallback {
	// This should really be Runtime, but Runtime itself uses this type.
	(any): void
}
