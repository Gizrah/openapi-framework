import { Injectable } from '@angular/core'
import { StateServiceClass } from 'app/common/classes/state-service.class'

@Injectable({
	providedIn: 'root',
})
export class LoadingService extends StateServiceClass {
	constructor() {
		super()
	}
}
