// "1.10.0" > "1.9.2"; a pre-release sorts below its release.
export function compareVersions(a: string, b: string): number {
	const parse = (v: string) => {
		const [core, pre = ''] = v.split('-', 2);
		return { nums: core.split('.').map((n) => Number.parseInt(n, 10) || 0), pre };
	};
	const x = parse(a);
	const y = parse(b);
	for (let i = 0; i < Math.max(x.nums.length, y.nums.length); i++) {
		const d = (x.nums[i] ?? 0) - (y.nums[i] ?? 0);
		if (d) return d;
	}
	if (x.pre === y.pre) return 0;
	if (!x.pre) return 1;
	if (!y.pre) return -1;
	return x.pre.localeCompare(y.pre, 'en', { numeric: true });
}
