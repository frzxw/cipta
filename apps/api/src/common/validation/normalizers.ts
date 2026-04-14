interface TransformInput {
  value: unknown;
}

export const normalizeEmail = ({ value }: TransformInput): unknown => {
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }

  return value;
};

export const normalizeTrimmedString = ({ value }: TransformInput): unknown => {
  if (typeof value === 'string') {
    return value.trim();
  }

  return value;
};
