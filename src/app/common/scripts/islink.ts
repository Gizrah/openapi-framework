const rx = new RegExp(/[\w]+\.[\w]{2,3}(\.[\w]{2,3})?\//gi)

export const isLink = (val: string): boolean => {
	if (val.startsWith('http')) return true
	return rx.test(val)
}
