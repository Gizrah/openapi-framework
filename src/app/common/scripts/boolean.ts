export const parseBool = (parse) => {
	const truthy = new RegExp(/(true)/gi)
	const falsy = new RegExp(/(false)/gi)

	if (truthy.test(parse)) return true
	if (falsy.test(parse)) return false
	else return 'NaB'
}

export const isNaB = <T>(parse): parse is T => {
	return parseBool(parse) === 'NaB'
}
