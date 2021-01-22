import { ChangeDetectorRef, Component } from '@angular/core'
import { FadeInOutAnimation } from '@quebble/animations'
import { StorageKeys } from '@quebble/consts'
import { hasValue } from '@quebble/scripts'
import { StorageService } from '@quebble/services'
import * as _moment from 'moment'

import { NgqFieldWrapper } from '../../classes/formly.extend'

export const moment = _moment
@Component({
	selector: 'formly-object-select-wrapper',
	animations: FadeInOutAnimation,
	template: `
		<div class="object_select" #objectselect>
			<div class="object_select-row ngq-form-validity">
				<ng-template [ngIf]="label">
					<ng-template [ngIf]="devmode">
						<label
							class="accent"
							matTooltip="::DEV:: Log ObjectOrSelectWrapperComponent to console"
							(click)="__log()"
						>
							{{ label | translink }}
						</label>
					</ng-template>

					<ng-template [ngIf]="!devmode">
						<label class="accent">
							{{ label | translink }}
						</label>
					</ng-template>
				</ng-template>

				<div class="ngq-label-line"></div>

				<i class="ngq-form-active fa fa-chevron-right" *ngIf="ngq.state" [@fadeInOut]></i>

				<ngq-button
					[icon]="['edit', 'search']"
					[color]="['info-alt', 'success-alt', 'primary-alt']"
					(click)="edit()"
					mode="mini"
					position="top-left"
					*ngIf="!existing && !ngq.state"
					[@fadeInOut]
				>
					{{ 'generic.enter' | translink }}
				</ngq-button>

				<ngq-button
					[icon]="['edit', 'search']"
					[color]="['info-alt', 'warning-alt', 'primary-alt']"
					(click)="edit()"
					position="top-left"
					mode="mini"
					*ngIf="existing && !ngq.state"
					[@fadeInOut]
				>
					{{ 'generic.alter' | translink }}
				</ngq-button>
			</div>

			<div class="object_select-current" *ngIf="deletable && modelsubject">
				<span>{{ model[subject] }}</span>

				<div
					class="object_select-clear ripple-color"
					matRipple
					*ngIf="existing && !ngq.state"
					[matTooltip]="'common.form.unlink' | translink: { subject: model[subject] }"
					[@fadeInOut]
					(click)="clear()"
				>
					<i class="fa fa-times-circle"></i>
				</div>
			</div>
		</div>
	`,
	styleUrls: ['object-or-select.wrapper.scss'],
})
export class ObjectOrSelectWrapperComponent extends NgqFieldWrapper {
	constructor(private cdRef: ChangeDetectorRef, private storage: StorageService) {
		super()
	}

	get valid(): boolean {
		return this.formControl.valid && this.resetable
	}

	get resetable(): boolean {
		return !this.formControl.pristine || this.formControl.touched || this.formControl.dirty
	}

	get deletable(): boolean {
		return this.existing || this.resetable
	}

	get existing(): boolean {
		return hasValue(this.model) && hasValue(this.model['id'])
	}

	get modelsubject(): boolean {
		return hasValue(this.model) && hasValue(this.model[this.subject])
	}

	public ngOnInit(): void {
		super.ngOnInit()
	}

	public ngAfterContentInit(): void {
		super.ngAfterContentInit()
	}

	public edit(): void {
		this.storage.cache.set(
			StorageKeys.Form.Field,
			this.getNestedField(this.field, 'object-select'),
		)
	}

	public clear(): void {
		this.formControl.reset()
		this.overwriteModel(undefined)
		this.cdRef.detectChanges()
	}
}
