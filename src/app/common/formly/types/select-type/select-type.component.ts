import { startWith } from 'rxjs/operators'

import { Component } from '@angular/core'
import { FadeInOutAnimation } from '@quebble/animations'
import { StorageKeys } from '@quebble/consts'
import { asArray } from '@quebble/scripts'
import { StorageService } from '@quebble/services'
import { Subscription } from 'rxjs'

import { NgqFieldType } from '../../classes/formly.extend'

@Component({
	selector: 'formly-select-type',
	animations: FadeInOutAnimation,
	template: `
		<div class="select_type" #selecttype>
			<div class="select_type-add ngq-form-validity">
				<ng-template [ngIf]="label">
					<ng-template [ngIf]="devmode">
						<label
							class="accent"
							matTooltip="::DEV:: Log SelectTypeComponent to console"
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
					[icon]="['check-square-o', 'plus-circle']"
					[color]="['info-alt', 'success-alt', 'primary-alt']"
					position="top-left"
					[disabled]="ngq.state"
					mode="mini"
					*ngIf="!ngq.state"
					(click)="toggleList()"
					[@fadeInOut]
				>
					{{ 'generic.select' | translink }}
				</ngq-button>
			</div>

			<div class="select_type-selected" *ngIf="items.length">
				<ng-container *ngFor="let item of items; let index = index">
					<div class="select_type-li">
						<span>
							{{ item[ngq.subject] }}
						</span>
						<div
							class="select_type-remove ripple-color"
							matRipple
							*ngIf="!ngq.state"
							[matTooltip]="
								'common.form.unlink' | translink: { subject: model[subject] }
							"
							[@fadeInOut]
							(click)="remove(index)"
						>
							<i class="fa fa-times-circle"></i>
						</div>
					</div>
				</ng-container>
			</div>
		</div>
	`,
	styleUrls: ['select-type.component.scss'],
})
export class SelectTypeComponent extends NgqFieldType {
	private _selected: any[] = []
	private value$: Subscription

	constructor(private storage: StorageService) {
		super()
	}

	get items(): any[] {
		return asArray(this._selected)
	}

	public ngOnInit(): void {
		super.ngOnInit(true)
	}

	public ngAfterContentInit(): void {
		super.ngAfterContentInit()

		this.value$ = this.formControl.valueChanges
			.pipe(startWith(this._values))
			.subscribe((values) => {
				this._selected = asArray(values)
			})
	}

	public ngOnDestroy(): void {
		this.value$?.unsubscribe()
	}

	public remove(index: number): void {
		const selected = Array.isArray(this._selected) ? this._selected : undefined

		if (this.to.multiple) {
			this._selected = asArray(selected)
			this._selected.splice(index, 1)
		} else this._selected = selected

		this.formControl.patchValue(this._selected)

		const key = this.field.key as string
		this.field.parent.model[key] = selected
	}

	public toggleList(): void {
		if (this.ngq.state) return

		this.storage.cache.set(
			StorageKeys.Form.Field,
			this.getNestedField(this.field, 'select-item'),
		)
	}
}
