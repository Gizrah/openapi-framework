import { ChangeDetectorRef, Injectable, OnDestroy, Pipe, PipeTransform } from '@angular/core'
import { TranslatePipe } from '@ngx-translate/core'

import { TransLinkService } from '../service/translink.service'

@Injectable()
@Pipe({
	name: 'translink',
	pure: false,
})
export class TranslinkPipe extends TranslatePipe implements PipeTransform, OnDestroy {
	constructor(translate: TransLinkService, _ref: ChangeDetectorRef) {
		super(translate, _ref)
	}

	public updateValue(key: string, interpolateParams?: object, translations?: any): void {
		super.updateValue(key, interpolateParams, translations)
	}

	public transform(query: string, ...args: any[]): any {
		return super.transform(query, ...args)
	}

	public ngOnDestroy(): void {
		super.ngOnDestroy()
	}
}
