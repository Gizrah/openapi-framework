import { HttpErrorResponse } from '@angular/common/http'

import { OperationType } from '../../openapi/types/openapi.types'

export class HttpError {
	public method: OperationType = undefined
	public url: string = undefined
	public error: HttpErrorResponse = undefined
}
