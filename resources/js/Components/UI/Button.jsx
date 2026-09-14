import { Link } from '@inertiajs/react';
import { forwardRef } from 'react';

import Icon from '@/Components/Icon';

const VARIANTS = {
    primary:
        'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 focus-visible:ring-emerald-500 disabled:hover:bg-emerald-500',
    secondary:
        'bg-zinc-800 text-zinc-100 ring-1 ring-inset ring-zinc-700 hover:bg-zinc-700 focus-visible:ring-zinc-500 disabled:hover:bg-zinc-800',
    outline:
        'bg-transparent text-zinc-300 ring-1 ring-inset ring-zinc-700 hover:bg-zinc-800 hover:text-zinc-100 focus-visible:ring-zinc-500 disabled:hover:bg-transparent',
    danger: 'bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-500 disabled:hover:bg-rose-600',
    ghost: 'bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 focus-visible:ring-zinc-600',
};

const SIZES = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-sm gap-2',
};

const BASE =
    'inline-flex items-center justify-center rounded-lg font-medium transition ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ' +
    'disabled:cursor-not-allowed disabled:opacity-40';

const Button = forwardRef(function Button(
    {
        variant = 'primary',
        size = 'md',
        icon,
        href,
        type = 'button',
        className = '',
        loading = false,
        disabled = false,
        children,
        ...props
    },
    ref,
) {
    const classes = [BASE, VARIANTS[variant] ?? VARIANTS.primary, SIZES[size] ?? SIZES.md, className]
        .filter(Boolean)
        .join(' ');

    const content = (
        <>
            {loading ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
                icon && <Icon name={icon} className="h-4 w-4" />
            )}
            {children}
        </>
    );

    if (href) {
        return (
            <Link ref={ref} href={href} className={classes} {...props}>
                {content}
            </Link>
        );
    }

    return (
        <button ref={ref} type={type} className={classes} disabled={disabled || loading} {...props}>
            {content}
        </button>
    );
});

export default Button;
