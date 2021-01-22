import { animate, group, sequence, state, style, transition, trigger } from '@angular/animations'

export const SlideInOutAnimation = [
	trigger('slideInOut', [
		state(
			'in',
			style({
				'max-height': '500px',
				opacity: '1',
				visibility: 'visible',
			}),
		),
		state(
			'out',
			style({
				'max-height': '0px',
				opacity: '0',
				visibility: 'hidden',
			}),
		),
		transition('in => out', [
			group([
				animate(
					'400ms ease-in-out',
					style({
						opacity: '0',
					}),
				),
				animate(
					'600ms ease-in-out',
					style({
						'max-height': '0px',
					}),
				),
				animate(
					'700ms ease-in-out',
					style({
						visibility: 'hidden',
					}),
				),
			]),
		]),
		transition('out => in', [
			group([
				animate(
					'1ms ease-in-out',
					style({
						visibility: 'visible',
					}),
				),
				animate(
					'600ms ease-in-out',
					style({
						'max-height': '500px',
					}),
				),
				animate(
					'800ms ease-in-out',
					style({
						opacity: '1',
					}),
				),
			]),
		]),
	]),
]

export const FadeInOutAnimation = [
	trigger('fadeInOut', [
		transition(':enter', [
			style({ opacity: 0 }),
			animate('0.2s 0.15s ease-out', style({ opacity: 1 })),
		]),
		transition(':leave', [
			style({ opacity: 1 }),
			animate('0.15s ease-in', style({ opacity: 0 })),
		]),
	]),
]

export const FadeInAnimation = [
	trigger('fadeIn', [
		transition(':enter', [
			style({ opacity: 0 }),
			animate('0.25s ease-in-out', style({ opacity: 1 })),
		]),
	]),
]

export const FlipY = [
	trigger('flipY', [
		transition(':enter', [
			style({ opacity: 0 }),
			sequence([
				animate('0.15s', style({ opacity: 0 })),
				animate('0.15s ease-in-out', style({ opacity: 1 })),
			]),
		]),
		transition(':leave', [
			style({ opacity: 1 }),
			sequence([
				animate('0.5s ease-in-out', style({ transform: 'rotateY(180deg)' })),
				animate('0.15s ease-in-out', style({ opacity: 0 })),
			]),
		]),
	]),
]

export const SlideOut = [
	trigger('slideOut', [
		transition(':leave', [
			style({ opacity: 1 }),
			animate('0.2s ease-out', style({ transform: 'translateX(-100vw)' })),
		]),
	]),
]
