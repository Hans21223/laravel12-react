import { forwardRef, useId } from 'react';

const CONTROL =
    'block w-full rounded-lg border-zinc-700 bg-zinc-900 text-sm text-zinc-100 placeholder-zinc-600 shadow-sm ' +
    'transition focus:border-emerald-500 focus:ring-emerald-500 disabled:opacity-50';

const CONTROL_INVALID = 'border-rose-600 focus:border-rose-500 focus:ring-rose-500';

export function InputError({ message, className = '', ...props }) {
    if (!message) {
        return null;
    }

    return (
        <p className={`mt-1.5 text-xs text-rose-400 ${className}`} role="alert" {...props}>
            {message}
        </p>
    );
}

export function Label({ htmlFor, children, required = false, className = '' }) {
    return (
        <label
            htmlFor={htmlFor}
            className={`mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400 ${className}`}
        >
            {children}
            {required && <span className="ml-1 text-rose-400">*</span>}
        </label>
    );
}

/**
 * ช่องกรอกข้อความพร้อม label และข้อความ error
 * ผูก id/aria ให้อัตโนมัติ เพื่อให้โปรแกรมอ่านหน้าจอใช้งานได้
 */
export const TextField = forwardRef(function TextField(
    { label, error, hint, required = false, className = '', containerClassName = '', id, ...props },
    ref,
) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;

    return (
        <div className={containerClassName}>
            {label && (
                <Label htmlFor={inputId} required={required}>
                    {label}
                </Label>
            )}
            <input
                ref={ref}
                id={inputId}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className={`${CONTROL} ${error ? CONTROL_INVALID : ''} ${className}`}
                {...props}
            />
            {hint && !error && <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>}
            {error && <InputError message={error} id={errorId} />}
        </div>
    );
});

export const SelectField = forwardRef(function SelectField(
    { label, error, options = [], placeholder, required = false, className = '', containerClassName = '', id, ...props },
    ref,
) {
    const generatedId = useId();
    const selectId = id ?? generatedId;

    return (
        <div className={containerClassName}>
            {label && (
                <Label htmlFor={selectId} required={required}>
                    {label}
                </Label>
            )}
            <select
                ref={ref}
                id={selectId}
                aria-invalid={error ? true : undefined}
                className={`${CONTROL} ${error ? CONTROL_INVALID : ''} ${className}`}
                {...props}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((option) => {
                    const value = typeof option === 'string' ? option : option.value;
                    const label = typeof option === 'string' ? option : option.label;

                    return (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    );
                })}
            </select>
            <InputError message={error} />
        </div>
    );
});
