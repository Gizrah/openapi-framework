import { Injectable } from '@angular/core'
import { Subject } from 'rxjs'

@Injectable({
	providedIn: 'root',
})
export class WebCancelService {
	private cancel$: Subject<void> = new Subject()

	public cancel() {
		this.cancel$.next()
	}

	public watch() {
		return this.cancel$.asObservable()
	}
}
