import { IsDateString, IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';

export class CreateEntryDto {
	@IsOptional()
	@IsString()
	clientId?: string | null;

	@IsEnum({ income: 'income', expense: 'expense' })
	type!: 'income' | 'expense';

	@IsString()
	description!: string;

	@IsString()
	category!: string;

	@IsNumberString()
	value!: string; // decimal

	@IsEnum({ BRL: 'BRL', USD: 'USD', EUR: 'EUR' })
	currency!: 'BRL' | 'USD' | 'EUR';

	@IsDateString()
	dueDate!: string; // YYYY-MM-DD

	@IsOptional()
	@IsDateString()
	paymentDate?: string | null;

	@IsEnum({ monthly: 'monthly', yearly: 'yearly', none: 'none' })
	recurrence!: 'monthly' | 'yearly' | 'none';

	@IsOptional()
	@IsString()
	supplier?: string | null;
}


