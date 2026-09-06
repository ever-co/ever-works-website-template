import { Skeleton as HeroSkeleton } from '@heroui/react';
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: Readonly<React.HTMLAttributes<HTMLDivElement>>) {
	return (
		<HeroSkeleton
			className={cn('animate-pulse rounded-md bg-gray-200/50 dark:bg-white/6', className)}
			{...props}
		/>
	);
}

interface TableSkeletonProps {
	rows?: number;
	columns?: number;
	className?: string;
}

function TableSkeleton({ rows = 5, columns = 6, className }: Readonly<TableSkeletonProps>) {
	return (
		<div className={cn('w-full max-w-7xl mx-auto', className)}>
			{/* Header skeleton */}
			<div className="flex items-center space-x-4 p-4 border-b border-gray-200 dark:border-white/6">
				{Array.from({ length: columns }).map((_, index) => (
					<Skeleton
						key={`header-${index}`}
						className={cn('h-4', index === 0 ? 'w-24' : index === 1 ? 'w-32' : 'w-20')}
					/>
				))}
			</div>

			{/* Rows skeleton */}
			{Array.from({ length: rows }).map((_, rowIndex) => (
				<div
					key={`row-${rowIndex}`}
					className="flex items-center space-x-4 p-4 border-b border-gray-100 dark:border-white/6"
				>
					{Array.from({ length: columns }).map((_, colIndex) => (
						<Skeleton
							key={`cell-${rowIndex}-${colIndex}`}
							className={cn('h-4', colIndex === 0 ? 'w-24' : colIndex === 1 ? 'w-32' : 'w-16')}
						/>
					))}
				</div>
			))}
		</div>
	);
}

interface CardSkeletonProps {
	className?: string;
}

function CardSkeleton({ className }: CardSkeletonProps) {
	return (
		<div
			className={cn(
				'bg-white dark:bg-white/3 rounded-xl shadow-xs border border-gray-200 dark:border-white/6 p-6',
				className
			)}
		>
			<div className="space-y-4">
				<Skeleton className="h-6 w-3/4" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-2/3" />
				<div className="flex space-x-2">
					<Skeleton className="h-6 w-16" />
					<Skeleton className="h-6 w-20" />
				</div>
			</div>
		</div>
	);
}

// Skeleton for grid layout of items
function GridSkeleton({ count = 18, className }: { count?: number; className?: string }) {
	return (
		<div
			className={cn(
				'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto w-full pt-3 min-h-screen pb-20',
				className
			)}
		>
			{Array.from({ length: count }).map((_, i) => (
				<CardSkeleton key={i} />
			))}
		</div>
	);
}

// Skeleton for item detail page
function ItemDetailSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn('space-y-6 p-6 container max-w-7xl w-full mx-auto pt-3 min-h-screen pb-20', className)}>
			{/* Breadcrumb */}
			<div className="flex gap-2">
				<Skeleton className="h-4 w-16" />
				<Skeleton className="h-4 w-4" />
				<Skeleton className="h-4 w-24" />
			</div>

			{/* Header with image and title */}
			<div className="flex gap-6">
				<Skeleton className="h-24 w-24 rounded-lg" />
				<div className="flex-1 space-y-3">
					<Skeleton className="h-8 w-2/3" />
					<Skeleton className="h-4 w-1/2" />
					<div className="flex gap-2">
						<Skeleton className="h-6 w-20" />
						<Skeleton className="h-6 w-20" />
						<Skeleton className="h-6 w-20" />
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="space-y-3">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-4/5" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-5/6" />
			</div>

			{/* Tags */}
			<div className="flex gap-2 flex-wrap">
				<Skeleton className="h-8 w-16" />
				<Skeleton className="h-8 w-20" />
				<Skeleton className="h-8 w-24" />
				<Skeleton className="h-8 w-20" />
			</div>
		</div>
	);
}

// Skeleton for listing page content
function ListingSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn('space-y-6 max-w-7xl mx-auto w-full pt-3 min-h-screen pb-20', className)}>
			{/* Header with search and filters */}
			<div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
				<Skeleton className="h-10 w-full md:w-96" />
				<div className="flex gap-2">
					<Skeleton className="h-10 w-32" />
					<Skeleton className="h-10 w-32" />
				</div>
			</div>

			{/* Stats */}
			<div className="flex gap-2 items-center">
				<Skeleton className="h-4 w-48" />
			</div>

			{/* Grid of items */}
			<GridSkeleton count={18} />
		</div>
	);
}

// Skeleton for the Markdown-backed static info pages (about, terms of
// service, privacy policy, cookies): a badge, a hero title, the "last
// updated" chip and a long prose body.
function StaticPageSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn('max-w-7xl mx-auto w-full px-4 py-12 space-y-8', className)}>
			{/* Breadcrumb */}
			<Skeleton className="h-4 w-48" />

			{/* Badge + hero title + last-updated chip */}
			<div className="space-y-6">
				<Skeleton className="h-9 w-32 rounded-full" />
				<Skeleton className="h-14 w-full max-w-xl" />
				<Skeleton className="h-9 w-56 rounded-lg" />
			</div>

			{/* Content card: a few paragraph blocks */}
			<div className="rounded-2xl border border-slate-200 dark:border-white/6 p-6 sm:p-8 lg:p-12 space-y-8">
				{Array.from({ length: 4 }).map((_, sectionIndex) => (
					<div key={`static-page-skeleton-section-${sectionIndex}`} className="space-y-3">
						<Skeleton className="h-7 w-1/3" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-4/5" />
					</div>
				))}
			</div>
		</div>
	);
}

export {
	Skeleton,
	TableSkeleton,
	CardSkeleton,
	GridSkeleton,
	ItemDetailSkeleton,
	ListingSkeleton,
	StaticPageSkeleton
};
