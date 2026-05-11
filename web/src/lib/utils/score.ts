export function scoreCls(s: number): string {
	if (s >= 3.5) return 'score-h';
	if (s >= 3.0) return 'score-m';
	if (s >= 2.0) return 'score-l';
	return 'score-x';
}
