import { Component, ElementRef, HostBinding, Input, OnInit, ViewChild } from '@angular/core'
import { hasValue, Methods } from '@quebble/scripts'
import { BehaviorSubject, Subject, Subscription } from 'rxjs'
import { finalize } from 'rxjs/operators'

@Component({
	selector: 'ngq-card',
	template: `
		<div class="ngq_card">
			<ng-template [ngIf]="title">
				<div class="ngq_card-title ngq_card-title-{{ mode }}">
					<div class="ngq_card-icon" *ngIf="icon">
						<i class="fa fa-{{ icon }}"></i>
					</div>
					<h3>{{ title | translink }}</h3>
					<div class="ngq_card-actions">
						<ng-container *ngTemplateOutlet="actions"></ng-container>
					</div>
				</div>
			</ng-template>

			<ng-template [ngIf]="!title">
				<div class="ngq_card-ngqactions">
					<ng-container *ngTemplateOutlet="actions"></ng-container>
				</div>
			</ng-template>

			<div class="ngq_card-content" #content>
				<ng-container *ngIf="content">
					<ng-content></ng-content>
				</ng-container>
			</div>
		</div>

		<ng-template #actions>
			<ng-content select="ngq-actions"></ng-content>
		</ng-template>
	`,
	styleUrls: ['./ngq-card.component.scss'],
})
export class NgqCardComponent implements OnInit {
	@Input() public icon: string
	@Input() public title: string
	@Input() public columns: number
	@Input() public mode: 'dark' | 'light' = 'dark'
	@Input() public type: 'card' | 'tile' = 'card'
	@Input() public hover: boolean = false

	@ViewChild('content', { static: true })
	set contentNode(element: ElementRef<HTMLElement>) {
		this._content = element
		this.observe()
	}

	get noContent(): boolean {
		return this._noContent.getValue()
	}

	set noContent(state: boolean) {
		this._noContent.next(state)
	}

	private _noContent: BehaviorSubject<boolean> = new BehaviorSubject(false)
	private _content: ElementRef<HTMLElement>
	private $sub: Subscription

	constructor() {}

	public ngOnInit(): void {}
	public ngOnDestroy(): void {
		if (this.$sub) this.$sub.unsubscribe()
	}

	private observe(): void {
		if (!this._content) return
		if (this.$sub) this.$sub.unsubscribe()
		const subject = new Subject<boolean>()

		const observer = Methods.Observer(this._content.nativeElement, (state) => {
			subject.next(state)
		})

		this.$sub = subject.pipe(finalize(() => observer.disconnect())).subscribe(() => {
			const nodes = this._content.nativeElement.childNodes
			if (!nodes.length) this.noContent = true
			else if (nodes.length) {
				let justComments = false
				nodes.forEach((node: HTMLElement, index: number) => {
					if (index > 0 && !justComments) return
					justComments = !node.tagName
				})
				this.noContent = justComments
			} else {
				this.noContent = false
			}
		})
	}

	@HostBinding('class')
	get __componentClass(): string {
		const base = `ngq_card`
		let defaults = `wrapper shade ${base}`
		if (hasValue(this.columns)) defaults += `list-${this.columns}`
		if (this.noContent) defaults += ` ${base}-nocontent`
		if (this.hover) defaults += ` shade-hover`
		return defaults
	}
}
