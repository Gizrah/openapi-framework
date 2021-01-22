export const isGuid = (val: any) => {
	const rx = new RegExp(
		/(\{){0,1}[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(\}){0,1}/gi,
	)

	return rx.test(val)
}
