import { Component, Input } from '@angular/core'
import { ActivatedRoute } from '@angular/router'

import { OpenApiService } from '../../services/openapi/service/openapi.service'
import { OperationId } from '../../services/openapi/types/openapi.types'

@Component({
	selector: 'ngq-generic-link',
	template: `
		<a class="underline-amplify" [routerLink]="link">
			<ng-template [ngIf]="subject && item">
				{{ item[subject] }}
			</ng-template>
			<ng-template [ngIf]="!subject">
				<ng-content></ng-content>
			</ng-template>
			<i class="fa fa-link"></i>
		</a>
	`,
	styleUrls: ['./ngq-generic-link.component.scss'],
})
export class NgqGenericLinkComponent {
	@Input() public operationId: OperationId
	@Input() public item: any
	@Input() public subject: any

	private _link: any[]

	constructor(private openapi: OpenApiService, private active: ActivatedRoute) {}

	get link(): any[] {
		if (this.operationId && this.item) {
			const route = this.openapi.getNestedRouterLink(this.operationId, 'get', this.item)
			this._link = route.length ? route : null
		} else {
			this._link = null
		}

		return this._link
	}
}
