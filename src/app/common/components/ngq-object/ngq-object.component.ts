import { Component, Input } from '@angular/core'
import { OpenApi } from '@quebble/openapi'

@Component({
	selector: 'ngq-object',
	template: `
		<ng-container *ngFor="let ref of objectDef?.refs">
			<ng-template [ngIf]="ref.type === 'array'">
				<ng-container
					*ngTemplateOutlet="
						arrayItems;
						context: {
							list: data[ref.prop],
							ref: ref
						}
					"
				></ng-container>
			</ng-template>

			<ng-template [ngIf]="ref.type === 'keyvalue'">
				<ng-container
					*ngTemplateOutlet="
						genericItem;
						context: {
							prefix: ref.tlstring || operation?.prefix,
							key: ref.prop,
							value: data[ref.prop],
							valprefix: ref.prefix,
							justvalue: false
						}
					"
				></ng-container>
			</ng-template>

			<ng-template [ngIf]="ref.type === 'address'">
				<ng-container
					*ngTemplateOutlet="
						addressItem;
						context: {
							item: data[ref.prop],
							ref: ref
						}
					"
				>
				</ng-container>
			</ng-template>

			<ng-template [ngIf]="ref.type === 'avatar'">
				<ng-container
					*ngTemplateOutlet="
						avatarItem;
						context: {
							avatar: data[ref.prop],
							subject: data[objectDef.subject]
						}
					"
				>
				</ng-container>
			</ng-template>

			<ng-template [ngIf]="ref.type === 'image'">
				<ng-container
					*ngTemplateOutlet="
						imageItem;
						context: {
							image: data[ref.prop]
						}
					"
				></ng-container>
			</ng-template>

			<ng-template [ngIf]="ref.type === 'description'">
				<ng-container
					*ngTemplateOutlet="
						descriptionItem;
						context: {
							description: data[ref.prop],
							subject: ref.subject
						}
					"
				></ng-container>
			</ng-template>
		</ng-container>

		<ng-template #arrayItems let-list="list" let-ref="ref">
			<ng-template [ngIf]="ref.id && list?.length">
				<ngq-generic [prefix]="ref.prefix || operation?.prefix" [key]="ref.prop">
					<span class="ngq_object-array">
						<ng-container *ngFor="let nested of list; let first = first">
							<ng-template [ngIf]="!first">
								<span class="ngq_object-comma">,</span>
							</ng-template>

							<ngq-generic-link
								[operationId]="ref.id"
								[item]="nested"
								[subject]="ref.subject"
							>
							</ngq-generic-link>
						</ng-container>
					</span>
				</ngq-generic>
			</ng-template>
			<ng-template [ngIf]="!ref.id && list?.length">
				<ngq-generic [prefix]="ref.prefix || operation?.prefix" [key]="ref.prop">
					<span class="ngq_object-array">
						<ng-container *ngFor="let nested of list; let first = first">
							<ng-template [ngIf]="!first">
								<span class="ngq_object-comma">,</span>
							</ng-template>
							<ng-container
								*ngTemplateOutlet="
									genericItem;
									context: {
										value: nested,
										valueprefix: ref.prefix,
										justvalue: true
									}
								"
							></ng-container>
						</ng-container>
					</span>
				</ngq-generic>
			</ng-template>
		</ng-template>

		<ng-template
			#genericItem
			let-key="key"
			let-value="value"
			let-prefix="prefix"
			let-valprefix="valprefix"
			let-justvalue="justvalue"
		>
			<ngq-generic
				[prefix]="prefix"
				[key]="key"
				[value]="value"
				[valprefix]="valprefix"
				[justvalue]="justvalue"
			>
			</ngq-generic>
		</ng-template>

		<ng-template #addressItem let-item="item" let-ref="ref">
			<ngq-description [title]="'schema.' + ref.tlstring + '.' + ref.prop | translink">
				{{ item?.street }}
				{{ item?.street_number }}
				{{ item?.street_number_additional }}
				<br />
				{{ item?.postal_code }}
				{{ item?.city }}
			</ngq-description>
		</ng-template>

		<ng-template #avatarItem let-avatar="avatar" let-subject="subject">
			<div class="ngq_object-row">
				<ngq-avatar [avatar]="avatar"></ngq-avatar>
				<h3>{{ subject }}</h3>
			</div>
		</ng-template>

		<ng-template #imageItem let-image="image">
			<div
				class="ngq_object-image"
				[style.backgroundImage]="'url(' + image + ')' | safeStyle"
				[style.display]="'block'"
				*ngIf="image"
			></div>
		</ng-template>

		<ng-template #descriptionItem let-description="description" let-subject="subject">
			<ngq-description
				[title]="subject || null"
				[style.marginBottom]="objectDef.refs?.length ? '0.5em' : '0'"
			>
				{{ description }}
			</ngq-description>
		</ng-template>
	`,
	styleUrls: ['./ngq-object.component.scss'],
})
export class NgqObjectComponent {
	@Input() public objectDef: OpenApi.ObjectDef
	@Input() public operation: OpenApi.Operation
	@Input() public prefix: string

	constructor() {}

	get data(): any {
		if (this.prefix) return this.objectDef?.data[this.prefix] ?? {}
		else return this.objectDef?.data ?? {}
	}
}
