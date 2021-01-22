import { asArray } from './asarray'
import { hasValue } from './hasvalue'
import { isPrimitive } from './isprimitive'

const shadow =
	'text-shadow: -1px -1px 0 #241c2c, 1px -1px 0 #241c2c, -1px 1px 0 #241c2c, 1px 1px 0 #241c2c;'
const success = 'color: #59ce06; '
const info = 'color: #336699; '
const warning = 'color: #edaa0b; '
const error = 'color: #fa2323; '
const white = 'color: #ffffff; ' + shadow

const colors = [success, info, warning, error]

/**
 * @summary
 * Logs a list of arguments to the console. Goes through a list of colors to
 * determine which color to use. The `type` property will determine the look of
 * the first item in the argument list and is skipped as index.
 *
 * [ Success, Info, Warning, Error ]
 *
 * @example
 * ```
 * 	 * Will show [Error, Warning] colors:
 * 	 * Index is: [-1: Error, 0: Sucess, 1: Info, 2: Warning]
 * 	dolog('error', 'Something went wrong', null, null, 'this is a warning')
 * ```
 *
 * @param type 'success' | 'info' | 'warning' | 'error' for the first item in
 * the argument list
 * @param args list of comma-seperated arguments to log. Value can be null to
 * force an index skip
 */
export const dolog = (type: 'success' | 'info' | 'warning' | 'error', ...args: any[]): void => {
	const items = asArray(args)
	const loglist = [white, warning, white]

	let idx: number = -2
	let logstring = `%c[%cNGQ%c]`

	for (const arg of items) {
		idx++
		if (!hasValue(arg)) continue
		if (!isPrimitive(arg)) {
			loglist.push(arg)
			continue
		}

		let color = colors[idx % 4]

		if (idx === -1) {
			switch (type) {
				case 'success':
					color = success
					break
				case 'info':
					color = info
					break
				case 'warning':
					color = warning
					break
				case 'error':
					color = error
					break
			}
		}

		if (/\[\w+\]/gi.test(arg)) {
			const stripped = arg.replace('[', '').replace(']', '')
			logstring = logstring + ` %c[%c${stripped}%c]`
			loglist.push(white, color, white)
		} else {
			logstring = logstring + ` %c${arg}`
			loglist.push(color)
		}
	}

	console.log(logstring, ...loglist)
}
