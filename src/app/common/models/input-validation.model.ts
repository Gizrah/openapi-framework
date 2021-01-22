interface INgqInputValidation {
	maxLength?: number
	minLength?: number
	max?: number
	min?: number
	pattern?: RegExp | string
	ref?: string[]
	message: string
}

export class NgqInputValidation {
	public maxLength?: number
	public minLength?: number
	public max?: number
	public min?: number
	public pattern?: RegExp | string
	public ref?: string[]
	public message: string

	constructor(attr?: INgqInputValidation) {
		if (!attr) return
		for (const key in attr) {
			this[key] = attr[key]
		}
	}
}
