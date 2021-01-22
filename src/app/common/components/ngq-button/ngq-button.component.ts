import {
	Component,
	ElementRef,
	HostBinding,
	Input,
	OnDestroy,
	SimpleChanges,
	ViewChild,
} from '@angular/core'
import { ButtonColor } from '@quebble/enums'
import { asArray, hasValue, isNaB, Methods } from '@quebble/scripts'
import { LoadingService } from '@quebble/services'
import { ButtonMode } from '@quebble/types'
import { BehaviorSubject, Subject, Subscription } from 'rxjs'
import { takeUntil } from 'rxjs/operators'

@Component({
	selector: 'ngq-button',
	template: `
		<div
			class="ngq_button button-default button-default-{{ primary }}"
			[class.button-disabled]="disabled || loading"
			[class.button-inactive]="inactive"
			#buttonmain
		>
			<div
				class="ngq_button-button"
				mat-ripple
				[matRippleDisabled]="disabled || loading || inactive || noripple"
			>
				<ng-template [ngIf]="!loading && icons?.length">
					<div class="ngq_button-icon" [style.font-size]="size">
						<ng-container *ngFor="let item of icons">
							<i class="fa fa-{{ item.icon }} {{ item.classes }}"></i>
						</ng-container>
					</div>
				</ng-template>

				<ng-template [ngIf]="loading">
					<div class="ngq_button-icon">
						<img src="/assets/img/loader.svg" />
					</div>
				</ng-template>

				<div class="ngq_button-content button-content-{{ text }}" #content>
					<ng-content></ng-content>
				</div>
			</div>
		</div>
	`,
	styleUrls: ['./ngq-button.component.scss'],
})
export class NgqButtonComponent implements OnDestroy {
	@ViewChild('content', { static: true }) private _content: ElementRef<HTMLElement>

	@Input() public mode: ButtonMode = 'normal'
	@Input() public disabled: boolean
	@Input() public inactive: boolean
	@Input() public shadow: boolean
	@Input() public noripple: boolean

	@Input()
	set color(color: ButtonColor | ButtonColor[]) {
		this._colors = asArray(color)
	}
	@Input() set position(pos: string | string[]) {
		this._positions = asArray(pos)
	}
	@Input()
	set icon(icon: string | string[]) {
		this._icons = asArray(icon)
	}

	@Input()
	set size(size: any) {
		if (size) {
			this._size = Methods.ParseSize(size)
		}
	}
	get size(): any {
		if (this._icons.length && this._size) return this._size.join('')
		else return undefined
	}

	@Input('loading')
	set loader(state: any) {
		if (!hasValue(state)) return

		if (isNaB<string | string[]>(state)) {
			this.setupLoader(state as string | string[])
		} else {
			this.loader$.next(state as boolean)
		}
	}

	get loading() {
		return this.loader$.getValue()
	}

	get content(): boolean {
		return this._content ? this._content.nativeElement.childNodes.length > 0 : false
	}

	private _size: [number, string]
	private _icons: string[] = []
	private _positions: string[] = []
	private _colors: ButtonColor[] = []
	private _setup: { icon: string; classes: string }[] = []
	private _textcolor: ButtonColor
	private _primary: ButtonColor

	private destroy$: Subject<void>
	private loader$: BehaviorSubject<boolean> = new BehaviorSubject(false)
	private sub$: Subscription

	constructor(private state: LoadingService) {}

	get icons(): { icon: string; classes: string }[] {
		return this._setup
	}

	get text(): string {
		return this._textcolor ?? this._colors[0] ?? 'primary-alt'
	}

	get primary(): string {
		return this._primary ?? this._colors[0] ?? 'primary-alt'
	}

	public ngOnDestroy(): void {
		if (this.destroy$) {
			this.destroy$.next()
			this.destroy$.complete()
		}
	}

	public ngOnChanges(changes: SimpleChanges): void {
		if ('icon' in changes || 'color' in changes || 'position' in changes) this.equalizeIcons()
	}

	public ngAfterContentInit(): void {
		this.equalizeIcons()
	}

	private equalizeIcons(): void {
		const icons = this._icons.filter((a) => !!a)
		const colors = this._colors.filter((a) => !!a)
		const positions = this._positions.filter((a) => !!a)
		const defpos = ['top-right', 'bottom-right', 'bottom-left', 'top-left']

		const firstI = icons.shift()
		const firstC = colors.shift()
		if (!firstI || !firstC) return

		const text = colors.length && this.content ? colors.pop() : firstC
		this._textcolor = text
		this._primary = firstC

		const primary = {
			icon: firstI,
			classes: `ngq_button-primary button-icon-${firstC}`,
		}

		const allicons = [primary]

		if (icons.length) {
			let iconpos = []
			if (positions.length) {
				const idxof = defpos.indexOf(positions[0])
				if (idxof > -1) {
					const after = defpos.slice(idxof)
					const before = [...defpos].splice(0, idxof)
					iconpos = [...after, ...before]
				} else {
					iconpos = defpos
				}
			} else {
				iconpos = defpos
			}

			let lastcolor: string = firstC

			icons.forEach((icon, index) => {
				const color = colors[index] ?? lastcolor
				lastcolor = color

				const butpos = `button-position-${iconpos[index]}`
				primary.classes += ` ${butpos}`

				const sec = {
					icon,
					classes: `ngq_button-secondary button-icon-${color} ${butpos}`,
				}

				allicons.push(sec)
			})
		}

		this._setup = allicons
	}

	private setupLoader(state: string | string[]): void {
		if (!state) return
		if (!this.destroy$) this.destroy$ = new Subject()

		if (this.sub$) {
			this.sub$.unsubscribe()
			this.sub$ = null
		}

		this.sub$ = this.state
			.get<string | string[], boolean>(state)
			.pipe(takeUntil(this.destroy$))
			.subscribe((state: boolean) => this.loader$.next(state))
	}

	@HostBinding('style.fontSize')
	get fontSize(): string {
		return this._size ? this._size.join('') : null
	}

	@HostBinding('class')
	get buttonMode(): string {
		const base = `ngq_button`
		const mode = `${base}-mode-${this.mode}`
		const empty = ` ${base}-notext`
		const shade = ` ${base}-shadow`

		let classes = mode
		if (!this.content) classes += empty
		if (this.shadow || (isNaB(this.shadow) && this.shadow !== undefined)) classes += shade

		return classes
	}
}
