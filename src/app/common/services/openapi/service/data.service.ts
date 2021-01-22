import { Injectable } from '@angular/core'
import { StateServiceClass } from '@quebble/classes'

@Injectable({
	providedIn: 'root',
})
export class OpenApiDataService extends StateServiceClass {
	constructor() {
		super('array', 'array')
	}
}
