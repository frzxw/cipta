'use client';

import * as LabelPrimitive from '@radix-ui/react-label';
import { Slot } from '@radix-ui/react-slot';
import {
  createContext,
  useContext,
  useId,
  useMemo,
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
  type Ref,
} from 'react';
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { Label } from './label';
import { cn } from './utils';

const Form = FormProvider;

interface FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName;
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  const ctx = useMemo(() => ({ name: props.name }), [props.name]);
  return (
    <FormFieldContext.Provider value={ctx as FormFieldContextValue}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

interface FormItemContextValue {
  id: string;
}

const FormItemContext = createContext<FormItemContextValue | null>(null);

function useFormField() {
  const fieldContext = useContext(FormFieldContext);
  const itemContext = useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext?.name });

  if (!fieldContext) throw new Error('useFormField must be used within <FormField>');
  if (!itemContext) throw new Error('useFormField must be used within <FormItem>');

  const fieldState = getFieldState(fieldContext.name, formState);
  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
}

export function FormItem({
  className,
  ref,
  ...props
}: HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }) {
  const id = useId();
  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn('space-y-1', className)} {...props} />
    </FormItemContext.Provider>
  );
}

export function FormLabel({
  className,
  ref,
  ...props
}: ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
  ref?: Ref<React.ComponentRef<typeof LabelPrimitive.Root>>;
}) {
  const { error, formItemId } = useFormField();
  return (
    <Label
      ref={ref}
      htmlFor={formItemId}
      className={cn('text-xs', error && 'text-destructive', className)}
      {...props}
    />
  );
}

export function FormControl({
  ref,
  ...props
}: ComponentPropsWithoutRef<typeof Slot> & { ref?: Ref<React.ComponentRef<typeof Slot>> }) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={!!error}
      {...props}
    />
  );
}

export function FormDescription({
  className,
  ref,
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { ref?: Ref<HTMLParagraphElement> }) {
  const { formDescriptionId } = useFormField();
  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn('text-[11px] text-muted-foreground', className)}
      {...props}
    />
  );
}

export function FormMessage({
  className,
  children,
  ref,
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { ref?: Ref<HTMLParagraphElement> }) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error.message ?? '') : children;
  if (!body) return null;
  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn('text-[11px] font-medium text-destructive', className)}
      {...props}
    >
      {body}
    </p>
  );
}

export { Form, FormField, useFormField };
