import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core'
import { StorageKeys } from '@quebble/consts'
import { asArray, hasValue } from '@quebble/scripts'
import { StorageService } from '@quebble/services'
import { Subject } from 'rxjs'
import { filter, map, takeUntil } from 'rxjs/operators'

import { NestedField, NgqFieldConfig, NgqFieldWrapper } from '../../../classes/formly.extend'

@Component({
	selector: 'ngq-nested-single',
	template: `
		<div
			class="nested_single"
			[class.nested_single-break]="break"
			resize
			(res-height)="height($event)"
		>
			<ng-container *ngFor="let nested of fields; let index = index">
				<div class="nested_single-field" [style.width]="width">
					<ng-container [ngSwitch]="nested.type">
						<ng-container *ngSwitchCase="'array-item'">
							<formly-array-item
								[field]="nested.field"
								[ids]="ids"
							></formly-array-item>
						</ng-container>

						<ng-container *ngSwitchCase="'select-item'">
							<formly-list-item [field]="nested.field"></formly-list-item>
						</ng-container>

						<ng-container *ngSwitchCase="'address-item'">
							<formly-address-item [field]="nested.field"></formly-address-item>
						</ng-container>

						<ng-container *ngSwitchCase="'object-select'">
							<formly-object-select
								[field]="nested.field"
								[ids]="ids"
							></formly-object-select>
						</ng-container>

						<ng-container *ngSwitchDefault>
							<ng-template [ngIf]="index > 0">
								<formly-object-item
									[field]="nested.field"
									[ids]="ids"
								></formly-object-item>
							</ng-template>

							<ng-container *ngFor="let f of field.fieldGroup">
								<ng-container
									*ngTemplateOutlet="
										showfield;
										context: {
											field: f,
											active: valid(f),
											invalid: invalid(f)
										}
									"
								></ng-container>

								<ng-template
									#showfield
									let-field="field"
									let-active="active"
									let-invalid="invalid"
								>
									<formly-field
										[field]="field"
										[class.nested_single-field-active]="active"
										[class.nested_single-field-invalid]="!active && invalid"
									></formly-field>
								</ng-template>
							</ng-container>
						</ng-container>
					</ng-container>
				</div>
			</ng-container>
		</div>
	`,
	styleUrls: ['nested-single.wrapper.scss'],
})
export class NgqNestedSingle extends NgqFieldWrapper implements OnInit, OnDestroy {
	public fields: NestedField[] = []
	public ids: string[] = []
	public childof: string[] = []
	public width: string = '100%'

	private _formId: string
	private destroy$: Subject<void> = new Subject()

	constructor(private storage: StorageService, private cdRef: ChangeDetectorRef) {
		super()
	}

	get break(): boolean {
		const per = this.width.includes('%')
		if (per) return false
		const w = parseInt(this.width)
		if (!isNaN(w)) return w < 350
		else return false
	}

	public ngOnInit(): void {
		this.primeSubscriptions()

		this._formId = this.field.ngqOptions?.formId
		this.setfields(this.getNestedField())
	}

	public ngOnDestroy(): void {
		this.destroy$.next()
		this.destroy$.complete()
		this.storage.cache.clear(StorageKeys.Form.Field)
		this.storage.cache.clear(StorageKeys.Form.Fields)
		this.storage.cache.clear(StorageKeys.Form.Height)
		this.storage.cache.clear(StorageKeys.Dialog.Nested)
	}

	private primeSubscriptions(): void {
		this.storage.cache
			.get<NgqFieldConfig>(StorageKeys.Form.Field)
			.pipe(
				filter((f: NestedField) => !!f && f?.formId === this._formId),
				takeUntil(this.destroy$),
			)
			.subscribe((nested: NestedField) => {
				const positions = (parent: string) => {
					const position = this.ids.indexOf(parent)

					if (position > -1) {
						nested.field.ngqOptions.state = true

						if (this.fields.length === 1) {
							const fields = this.fields.concat([nested])
							this.setfields(fields)
						} else {
							const fields = []
							this.fields.forEach((n, index) => {
								if (index > position) n.field.ngqOptions.state = false
								else fields.push(n)
							})

							fields.push(nested)
							this.setfields(fields)
						}
					}
				}

				switch (nested.type) {
					case 'array-item': {
						const parentId = nested.field?.parent?.parent?.id
						if (parentId) positions(parentId)
						break
					}
					case 'close': {
						this.close(nested.field?.id)
						break
					}
					default: {
						const parentId = nested.field?.parent?.id
						if (parentId) positions(parentId)
						break
					}
				}
			})

		this.storage.cache
			.get(StorageKeys.Dialog.Width)
			.pipe(takeUntil(this.destroy$))
			.subscribe((w: number) => {
				this.width = !hasValue(w) ? '100%' : w + 'px'
			})
	}

	private setfields(f: NestedField | NestedField[]) {
		const fields = asArray(f)
		this.fields = fields
		this.ids = fields.map((f) => f.field.id).filter((a) => !!a)
		this.childof = fields.map((f) => f.field.parent.id).filter((a) => !!a)

		const formFields = { [this._formId]: fields.map((f) => f.field) }
		this.storage.cache.set(StorageKeys.Form.Fields, formFields)

		this.storage.cache.set(StorageKeys.Dialog.Nested, this.fields.length > 1)
		this.cdRef.detectChanges()
	}

	private close(id: string): void {
		const idx = this.ids.indexOf(id)
		let fields = this.fields

		if (idx > -1) {
			const f = this.fields[idx]
			if (f) f.field.ngqOptions.state = false

			fields = this.fields.slice(0, idx)
		}

		this.setfields(fields)
	}

	public valid(field: NgqFieldConfig): boolean {
		if (!field) return false
		const { id } = field
		return this.ids.includes(id) || this.childof.includes(id)
	}

	public invalid(field: NgqFieldConfig): boolean {
		if (!field || !field.formControl) return false
		const { valid, invalid, pristine } = field.formControl
		return !valid && !pristine && invalid
	}

	public height(height: number): void {
		this.storage.cache.set(StorageKeys.Form.Height, height)
	}
}
