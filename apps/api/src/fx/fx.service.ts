import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

type Currency = 'BRL' | 'USD' | 'EUR';

@Injectable()
export class FxService {
	private baseUrl = process.env.FX_BASE_URL || 'https://api.exchangerate.host';

	constructor(private readonly prisma: PrismaService) {}

	private async fetchRate(date: string | 'latest', base: Currency, target: Currency) {
		const url =
			date === 'latest'
				? `${this.baseUrl}/latest?base=${base}&symbols=${target}`
				: `${this.baseUrl}/${date}?base=${base}&symbols=${target}`;
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 8000);
		try {
			const res = await fetch(url, { signal: controller.signal });
			if (!res.ok) {
				throw new Error(`FX fetch failed: ${res.status}`);
			}
			const json = (await res.json()) as any;
			const rate = json?.rates?.[target];
			if (!rate) throw new Error('Invalid FX response');
			return Number(rate);
		} finally {
			clearTimeout(timeout);
		}
	}

	async getRate(date: Date, base: Currency, target: Currency): Promise<number> {
		if (base === target) return 1;
		const iso = date.toISOString().slice(0, 10);
		const cached = await this.prisma.exchangeRate.findUnique({
			where: { date_base_target: { date: new Date(iso), base, target } },
		});
		if (cached) return Number(cached.rate);
		let rate: number | null = null;
		try {
			rate = await this.fetchRate(iso, base, target);
		} catch {
			// Fallback: usa taxa mais recente disponível
			try {
				rate = await this.fetchRate('latest', base, target);
			} catch {
				throw new Error('FX provider unavailable');
			}
		}
		await this.prisma.exchangeRate.create({
			data: { date: new Date(iso), base, target, rate: rate as any },
		});
		return rate;
	}

	async convert(
		amount: number,
		date: Date,
		from: Currency,
		to: Currency,
	): Promise<number> {
		const r = await this.getRate(date, from, to);
		return amount * r;
	}
}

