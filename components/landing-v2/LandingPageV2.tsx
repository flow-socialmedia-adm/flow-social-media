import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import {
	CalendarIcon,
	CheckIcon,
	LayoutGridIcon,
	SparklesIcon,
	UsersIcon,
	ZapIcon,
} from '../icons';
import { FlowBrandLogo } from '../brand/FlowBrandLogo';

export type LandingPageV2Props = {
	onNavigateToSignup: () => void;
	onNavigateToLogin: () => void;
	onBackToClassicLanding: () => void;
};

const Section: React.FC<{ id?: string; className?: string; children: React.ReactNode }> = ({
	id,
	className = '',
	children,
}) => (
	<section id={id} className={`px-4 sm:px-6 lg:px-8 ${className}`}>
		<div className="mx-auto max-w-6xl">{children}</div>
	</section>
);

export const LandingPageV2: React.FC<LandingPageV2Props> = ({
	onNavigateToSignup,
	onNavigateToLogin,
	onBackToClassicLanding,
}) => {
	const ctx = useContext(AppContext);
	const t = ctx?.t ?? ((k: string) => k);

	return (
		<div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
			<header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-white/85 backdrop-blur-md dark:bg-gray-950/85">
				<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
					<button
						type="button"
						onClick={onBackToClassicLanding}
						className="transition-opacity hover:opacity-90"
						aria-label={t('appName')}
					>
						<FlowBrandLogo variant="full" height={44} />
					</button>
					<div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
						<button
							type="button"
							onClick={onBackToClassicLanding}
							className="hidden text-xs font-medium text-gray-500 hover:text-indigo-600 sm:inline dark:text-gray-400 dark:hover:text-indigo-400"
						>
							Apresentação clássica
						</button>
						<button
							type="button"
							onClick={onNavigateToLogin}
							className="text-sm font-semibold text-gray-700 transition-colors hover:text-indigo-600 dark:text-gray-200 dark:hover:text-indigo-400"
						>
							{t('landing_login')}
						</button>
						<button
							type="button"
							onClick={onNavigateToSignup}
							className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700"
						>
							{t('landing_free_trial')}
						</button>
					</div>
				</div>
			</header>

			{/* Hero */}
			<div className="relative overflow-hidden pt-20">
				<div
					className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-800 dark:from-indigo-700 dark:via-violet-700 dark:to-purple-900"
					aria-hidden
				/>
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(255,255,255,0.22),transparent)]" />
				<Section className="relative py-16 sm:py-24 lg:py-28">
					<div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-10">
						<div className="landing-v2-reveal text-center lg:text-left">
							<h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
								Organize sua agência do seu jeito.
								<span className="mt-2 block text-lg font-semibold text-indigo-100 sm:text-xl lg:text-2xl">
									O sistema entende seu fluxo e executa com você.
								</span>
							</h1>
							<p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-indigo-100/95 lg:mx-0 lg:text-lg">
								Posts, tarefas, planejamento e equipe, tudo conectado. Sem complicação. Sem retrabalho. Sem
								perder controle.
							</p>
							<div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
								<button
									type="button"
									onClick={onNavigateToSignup}
									className="w-full rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50 sm:w-auto"
								>
									Começar grátis
								</button>
								<a
									href="#como-funciona"
									className="w-full rounded-xl border border-white/40 bg-white/10 px-6 py-3.5 text-center text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 sm:w-auto"
								>
									Ver como funciona
								</a>
							</div>
							<div className="landing-v2-reveal landing-v2-delay-2 mt-10 lg:hidden">
								<div className="rounded-2xl border border-white/25 bg-white/10 p-4 backdrop-blur-md">
									<p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">Visão rápida</p>
									<div className="mt-3 flex gap-2">
										<div className="h-12 flex-1 rounded-lg bg-white/20" />
										<div className="h-12 flex-1 rounded-lg bg-white/15" />
										<div className="h-12 flex-1 rounded-lg bg-white/25" />
									</div>
									<p className="mt-3 text-center text-xs font-medium text-indigo-100">Posts · Tarefas · Equipe conectados</p>
								</div>
							</div>
						</div>
						<div className="landing-v2-reveal landing-v2-delay-2 relative hidden min-h-[280px] lg:block">
							<div className="absolute right-0 top-0 w-[min(100%,380px)] rounded-2xl border border-white/20 bg-white/95 p-4 shadow-2xl dark:bg-gray-900/95">
								<p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Posts</p>
								<div className="mt-3 flex gap-2">
									<div className="h-16 flex-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50" />
									<div className="h-16 flex-1 rounded-lg bg-violet-50 dark:bg-violet-950/50" />
									<div className="h-16 flex-1 rounded-lg bg-purple-50 dark:bg-purple-950/50" />
								</div>
							</div>
							<div className="absolute bottom-4 left-0 w-[min(100%,320px)] rounded-2xl border border-white/20 bg-white/90 p-4 shadow-xl dark:bg-gray-900/90">
								<p className="text-xs font-medium text-gray-500 dark:text-gray-400">Próxima ação</p>
								<p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">Aprovar roteiro · Nike</p>
							</div>
							<div className="absolute left-1/4 top-1/3 rounded-xl border border-white/25 bg-white/15 px-3 py-2 text-xs font-medium text-white backdrop-blur-md">
								Fluxo sincronizado
							</div>
						</div>
					</div>
				</Section>
			</div>

			{/* Modos de operação */}
			<Section className="landing-v2-reveal landing-v2-delay-1 py-16 sm:py-20">
				<h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
					Não importa como sua agência funciona.
					<span className="mt-2 block text-lg font-semibold text-indigo-600 dark:text-indigo-400 sm:text-xl">
						O sistema se adapta a você.
					</span>
				</h2>
				<div className="mt-12 grid gap-6 md:grid-cols-3">
					{[
						{
							title: 'Trabalho sozinho',
							desc: 'Modo focado para quem faz tudo em um lugar só, com menos cliques e mais clareza no dia a dia.',
							icon: <ZapIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />,
						},
						{
							title: 'Equipe pequena',
							desc: 'Funções e níveis de acesso simples para quem acumula papéis sem perder o controle do que cada um faz.',
							icon: <UsersIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />,
						},
						{
							title: 'Equipe estruturada',
							desc: 'Modelos de permissão por função, alinhados ao jeito que sua agência realmente opera.',
							icon: <LayoutGridIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />,
						},
					].map((c) => (
						<div
							key={c.title}
							className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-indigo-800"
						>
							<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50">
								{c.icon}
							</div>
							<h3 className="text-lg font-bold text-gray-900 dark:text-white">{c.title}</h3>
							<p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{c.desc}</p>
						</div>
					))}
				</div>
			</Section>

			{/* Diferencial */}
			<Section className="border-y border-gray-200/80 bg-gradient-to-b from-indigo-50/50 to-white py-16 dark:border-gray-800 dark:from-indigo-950/20 dark:to-gray-950 sm:py-20">
				<div className="mx-auto max-w-3xl text-center">
					<div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/80 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-gray-900/80 dark:text-indigo-300">
						<SparklesIcon className="h-4 w-4" />
						Inteligência no fluxo
					</div>
					<h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
						Mais que organização.
						<span className="block text-indigo-600 dark:text-indigo-400">Inteligência no seu fluxo.</span>
					</h2>
					<p className="mt-4 text-base leading-relaxed text-gray-600 dark:text-gray-400">
						O sistema entende quem deve executar cada etapa e já sugere automaticamente.
					</p>
				</div>
				<div className="mx-auto mt-10 max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-900">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
						<div className="flex flex-1 flex-col items-center rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/80">
							<span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Status</span>
							<span className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">Criando legenda</span>
						</div>
						<span className="hidden text-indigo-400 sm:block" aria-hidden>
							→
						</span>
						<div className="flex flex-1 flex-col items-center rounded-xl bg-indigo-50 px-4 py-3 dark:bg-indigo-950/40">
							<span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
								Função
							</span>
							<span className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">Social Media</span>
						</div>
						<span className="hidden text-indigo-400 sm:block" aria-hidden>
							→
						</span>
						<div className="flex flex-1 flex-col items-center rounded-xl border-2 border-indigo-200 bg-white px-4 py-3 dark:border-indigo-700 dark:bg-gray-800">
							<span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
								Pessoa sugerida
							</span>
							<span className="mt-1 text-sm font-semibold text-indigo-700 dark:text-indigo-300">Mari</span>
						</div>
					</div>
				</div>
			</Section>

			{/* Como funciona */}
			<Section id="como-funciona" className="py-16 sm:py-20">
				<h2 className="text-center text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">Como funciona</h2>
				<div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
					{[
						{ step: '1', title: 'Organize clientes e planejamento', desc: 'Centralize informações e o plano de cada cliente.' },
						{ step: '2', title: 'Crie posts e tarefas', desc: 'Do conteúdo ao backlog, tudo ligado ao fluxo real.' },
						{ step: '3', title: 'Acompanhe o fluxo', desc: 'Veja status, responsáveis e próximos passos em um só lugar.' },
						{ step: '4', title: 'Sugestões automáticas', desc: 'O sistema propõe quem executa cada etapa, com base no seu modelo.' },
					].map((s, i) => (
						<div key={s.step} className="relative">
							{i < 3 && (
								<div
									className="absolute left-[calc(50%+1.5rem)] top-8 hidden h-px w-[calc(100%-3rem)] bg-gradient-to-r from-indigo-200 to-transparent lg:block dark:from-indigo-800"
									aria-hidden
								/>
							)}
							<div className="relative rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-900">
								<span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
									{s.step}
								</span>
								<h3 className="mt-4 font-bold text-gray-900 dark:text-white">{s.title}</h3>
								<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{s.desc}</p>
							</div>
						</div>
					))}
				</div>
			</Section>

			{/* Mockups */}
			<Section className="bg-gray-100/80 py-16 dark:bg-gray-900/50 sm:py-20">
				<h2 className="text-center text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
					Um painel para operar de verdade
				</h2>
				<p className="mx-auto mt-3 max-w-2xl text-center text-sm text-gray-600 dark:text-gray-400">
					Visualização simulada — posts em quadro, tarefas, equipe e responsáveis no mesmo ecossistema.
				</p>
				<div className="mt-10 grid gap-6 lg:grid-cols-2">
					<div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-900">
						<p className="text-xs font-bold uppercase tracking-wide text-gray-500">Kanban de posts</p>
						<div className="mt-4 flex gap-2 overflow-x-auto pb-2">
							{['Ideia', 'Produção', 'Aprovação'].map((col) => (
								<div key={col} className="min-w-[100px] flex-1 rounded-xl bg-gray-50 p-2 dark:bg-gray-800/80">
									<p className="text-[10px] font-semibold text-gray-500">{col}</p>
									<div className="mt-2 space-y-2">
										<div className="h-14 rounded-lg bg-white shadow-sm dark:bg-gray-700" />
										<div className="h-10 rounded-lg bg-indigo-100/80 dark:bg-indigo-900/40" />
									</div>
								</div>
							))}
						</div>
					</div>
					<div className="space-y-4">
						<div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-900">
							<p className="text-xs font-bold uppercase tracking-wide text-gray-500">Tarefas</p>
							<ul className="mt-3 space-y-2">
								{['Briefing aprovado', 'Gravação reels', 'Legenda cliente X'].map((x) => (
									<li
										key={x}
										className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm dark:border-gray-700"
									>
										<span className="h-2 w-2 rounded-full bg-indigo-500" />
										{x}
									</li>
								))}
							</ul>
						</div>
						<div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-900">
							<p className="text-xs font-bold uppercase tracking-wide text-gray-500">Equipe & responsáveis</p>
							<div className="mt-3 flex flex-wrap gap-2">
								{['Mari · Social', 'Lucas · Design', 'Ana · Gestão'].map((tag) => (
									<span
										key={tag}
										className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200"
									>
										{tag}
									</span>
								))}
							</div>
						</div>
					</div>
				</div>
			</Section>

			{/* Benefícios */}
			<Section className="py-16 sm:py-20">
				<h2 className="text-center text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
					Menos controle manual.
					<span className="mt-2 block text-lg font-semibold text-indigo-600 dark:text-indigo-400 sm:text-xl">
						Mais produtividade real.
					</span>
				</h2>
				<ul className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
					{[
						'Organize tudo em um só lugar',
						'Saiba quem está fazendo o quê',
						'Evite retrabalho',
						'Tenha previsibilidade',
						'Escale sua operação',
					].map((text) => (
						<li
							key={text}
							className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
						>
							<span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/50">
								<CheckIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
							</span>
							<span className="font-medium text-gray-800 dark:text-gray-200">{text}</span>
						</li>
					))}
				</ul>
			</Section>

			{/* Planos placeholder */}
			<Section className="border-t border-gray-200 bg-gradient-to-b from-white to-indigo-50/30 py-16 dark:border-gray-800 dark:from-gray-950 dark:to-indigo-950/20 sm:py-20">
				<h2 className="text-center text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">Planos</h2>
				<p className="mx-auto mt-2 max-w-xl text-center text-sm text-gray-600 dark:text-gray-400">
					Estrutura para evoluir — detalhes e valores podem ser ajustados antes do go-live.
				</p>
				<div className="mt-10 grid gap-6 md:grid-cols-3">
					{[
						{ name: 'Solo', hint: 'Um operador, fluxo direto.' },
						{ name: 'Equipe', hint: 'Colaboração com papéis claros.', featured: true },
						{ name: 'Agência', hint: 'Escala e governança.' },
					].map((p) => (
						<div
							key={p.name}
							className={`rounded-2xl border p-6 text-center shadow-sm transition hover:shadow-md ${
								p.featured
									? 'border-indigo-300 bg-white ring-2 ring-indigo-500/20 dark:border-indigo-600 dark:bg-gray-900'
									: 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
							}`}
						>
							<h3 className="text-lg font-bold text-gray-900 dark:text-white">{p.name}</h3>
							<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{p.hint}</p>
							<p className="mt-6 text-xs font-medium uppercase tracking-wide text-gray-400">Em definição</p>
						</div>
					))}
				</div>
			</Section>

			{/* CTA final */}
			<Section className="pb-20 pt-8">
				<div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 px-6 py-14 text-center shadow-xl sm:px-10">
					<CalendarIcon className="mx-auto h-10 w-10 text-white/90" />
					<h2 className="mt-6 text-2xl font-extrabold leading-tight text-white sm:text-3xl">
						Sua agência organizada.
						<span className="mt-2 block text-lg font-semibold text-indigo-100 sm:text-xl">
							Seu fluxo funcionando. Seu tempo de volta.
						</span>
					</h2>
					<button
						type="button"
						onClick={onNavigateToSignup}
						className="mt-8 rounded-xl bg-white px-8 py-4 text-base font-bold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
					>
						Começar grátis
					</button>
				</div>
			</Section>

			<footer className="border-t border-gray-200 bg-gray-50 py-8 dark:border-gray-800 dark:bg-gray-950">
				<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center text-sm text-gray-500 sm:flex-row sm:text-left dark:text-gray-400">
					<p>{t('landing_footer_text').replace('2024', String(new Date().getFullYear()))}</p>
					<button
						type="button"
						onClick={onBackToClassicLanding}
						className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
					>
						Voltar à apresentação clássica
					</button>
				</div>
			</footer>
		</div>
	);
};

export default LandingPageV2;
