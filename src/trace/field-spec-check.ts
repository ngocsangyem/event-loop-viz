/** Generic checker for the field tables that describe the Trace schema. */

type Primitive = 'string' | 'number' | 'boolean'

export interface FieldSpec {
  type: Primitive | 'enum' | 'string-array' | 'object'
  /** Allowed values when `type` is 'enum'. */
  values?: readonly string[]
  /** Nested fields when `type` is 'object'. */
  fields?: Record<string, FieldSpec>
  optional?: true
}

function checkValue(path: string, value: unknown, spec: FieldSpec): string[] {
  switch (spec.type) {
    case 'string':
    case 'number':
    case 'boolean':
      return typeof value === spec.type ? [] : [`${path}: expected ${spec.type}`]
    case 'enum':
      return typeof value === 'string' && spec.values?.includes(value)
        ? []
        : [`${path}: expected one of ${spec.values?.join('|')}, got ${String(value)}`]
    case 'string-array':
      return Array.isArray(value) && value.every((v) => typeof v === 'string')
        ? []
        : [`${path}: expected string[]`]
    case 'object':
      return typeof value === 'object' && value !== null
        ? checkFields(path, value as Record<string, unknown>, spec.fields ?? {})
        : [`${path}: expected object`]
  }
}

export function checkFields(
  where: string,
  record: Record<string, unknown>,
  schema: Record<string, FieldSpec>,
): string[] {
  const problems: string[] = []
  for (const [name, spec] of Object.entries(schema)) {
    const value = record[name]
    if (value === undefined) {
      if (!spec.optional) problems.push(`${where}.${name}: missing`)
    } else {
      problems.push(...checkValue(`${where}.${name}`, value, spec))
    }
  }
  for (const name of Object.keys(record)) {
    if (!(name in schema)) problems.push(`${where}.${name}: unknown field`)
  }
  return problems
}
