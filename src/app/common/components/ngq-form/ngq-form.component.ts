import { Component, ElementRef, EventEmitter, Input, OnInit, Output } from '@angular/core'
import { FormGroup } from '@angular/forms'
import { OpenApi } from '@quebble/openapi'
import { Subject, Subscription } from 'rxjs'
import { filter, takeUntil } from 'rxjs/operators'

import { NgqFieldConfig } from '../../formly/classes/formly.extend'

@Component({
	selector: 'ngq-form',
	template: `
		<ng-template [ngIf]="fields.length">
			<formly-form [form]="form" [fields]="fields" [model]="item" #formlyform></formly-form>
		</ng-template>
	`,
	styleUrls: ['./ngq-form.component.scss'],
})
export class NgqFormComponent implements OnInit {
	@Input() @Output() public item: any
	@Input() public operation: OpenApi.Operation
	@Input() public style: 'dialog' | 'cards' = 'dialog'

	@Output() public field: EventEmitter<NgqFieldConfig> = new EventEmitter()

	public form: FormGroup = new FormGroup({})
	public fields: NgqFieldConfig[] = []
	public model: any = {}

	private tls$: Subscription
	private destroy$: Subject<void> = new Subject()

	constructor(
		private formly: OpenApi.OpenApiFormlyService,
		public elRef: ElementRef<HTMLElement>,
	) {}

	public ngOnInit(): void {
		this.generateForm()
	}

	public ngOnDestroy(): void {
		this.destroy$.next()
		this.destroy$.complete()
	}

	/**
	 * @todo
	 * schema getter (this.operation.schemas.get(this. operation.type)) needs to
	 * be able to get anyOf/oneOf/allOf, but not through the operation model
	 */
	private generateForm() {
		if (!this.operation) return

		// const schema = this.operation.getDifferSchemas(this.operation.type, this.item)
		const schema = this.operation?.schemas?.get(this.operation.type)

		if (!schema) return

		if (this.tls$) this.tls$.unsubscribe()
		this.tls$ = this.formly
			.create(schema.title, this.style)
			.pipe(
				filter((config) => !!config),
				takeUntil(this.destroy$),
			)
			.subscribe((config) => {
				setTimeout(() => {
					this.fields = [config]
					this.field.emit(config)
				})
			})
	}
}
