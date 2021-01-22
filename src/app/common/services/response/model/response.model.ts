import { ResponseEventType } from '@quebble/enums'

export interface IResponse {
	message: string
	type: ResponseEventType
}

enum Icons {
	error = 'exclamation-circle',
	info = 'info-circle',
	success = 'check-circle',
	warning = 'exclamation-triangle',
	default = '',
}

export class ResponseModel {
	public message: string = undefined
	public params: Record<string, string> = {}
	public $type: ResponseEventType = undefined
	public icon: string = undefined

	constructor(response?: IResponse) {
		if (!response) return

		this.message = response.message
		this.type = response.type
	}

	set type(type: ResponseEventType) {
		this.$type = type
		this.icon = Icons[type]
	}

	get type(): ResponseEventType {
		return this.$type
	}
}
