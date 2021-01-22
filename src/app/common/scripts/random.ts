/**
 * @summary
 * Generate a random seed with a prefix (default: 'ngq-') that can be used to
 * create ids to differentiate between components, forms, or other objects that
 * can have multiple instances on the same page.
 *
 * Creates a random string that is `n` characters long with only alpha-numerical
 * characters -- [a-zA-Z0-9] -- after the given prefix.
 *
 * @param prefix prefix to add before the random string, default 'ngq-'
 * @param length length of the random string, default 14
 *
 * @returns string
 */
export const rndStr = (prefix: string = 'ngq-', length: number = 14): string => {
	let rv = prefix ?? ''
	const options = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'
	for (let i = 0; i < length; i++) {
		rv += options.charAt(Math.floor(Math.random() * options.length))
	}
	return rv
}

/**
 * @summary
 * Generate a random number between the given parameters. Optionally creates a
 * fraction of this number by dividing the number by the given parameter.
 *
 * @example
 * ```
 * 	* Any number between 0 and 10
 * 	const rng = randomNumber(0, 10)
 *
 * 	* Any number betwen 0.001 and 0.250
 * 	const rng = randomNumber(1, 250, 1000)
 * ```
 *
 * @param min lowest number in range
 * @param max highest number in range
 * @param fract optional fractional divider
 *
 * @returns integer or float
 */
export const rndNum = (min, max, fract?): number => {
	if (fract) return Math.floor(Math.random() * (max - min + 1) + min) / fract
	else return Math.floor(Math.random() * (max - min + 1) + min)
}
