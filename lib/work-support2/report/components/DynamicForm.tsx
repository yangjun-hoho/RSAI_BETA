'use client';
import { FormField, FormSchema } from '@/types/work-support2';

interface Props {
  schema: FormSchema;
  values: Record<string, unknown>;
  onChange: (id: string, value: unknown) => void;
  disabled?: boolean;
}

export default function DynamicForm({ schema, values, onChange, disabled }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {schema.fields.map(field => (
        <div key={field.id}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.78rem', color: '#374151', marginBottom: '3px' }}>
            {field.label}
            {field.required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
          </label>
          {renderField(field, values[field.id], (v) => onChange(field.id, v), disabled)}
        </div>
      ))}
    </div>
  );
}

function renderField(field: FormField, value: unknown, onChange: (v: unknown) => void, disabled?: boolean) {
  const baseStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.35rem 0.6rem',
    borderRadius: '5px',
    border: '1px solid #d1d5db',
    fontSize: '0.8rem',
    outline: 'none',
    boxSizing: 'border-box',
    background: disabled ? '#f9fafb' : '#fff',
  };

  switch (field.type) {
    case 'text':
      return (
        <input
          type="text"
          value={String(value ?? '')}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          style={baseStyle}
        />
      );
    case 'textarea':
      return (
        <textarea
          value={String(value ?? '')}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          rows={4}
          style={{ ...baseStyle, resize: 'vertical' }}
        />
      );
    case 'toggle': {
      const checked = value !== undefined ? Boolean(value) : Boolean(field.default);
      return (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(!checked)}
          style={{
            width: '32px',
            height: '18px',
            borderRadius: '9px',
            border: 'none',
            background: checked ? '#4f46e5' : '#d1d5db',
            cursor: disabled ? 'not-allowed' : 'pointer',
            position: 'relative',
            transition: 'background 0.2s',
          }}
        >
          <span style={{
            position: 'absolute',
            top: '2px',
            left: checked ? '16px' : '2px',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
          }} />
        </button>
      );
    }
    case 'select': {
      const options = field.options || [];
      const selected = value !== undefined ? String(value) : String(field.default ?? options[0] ?? '');
      return (
        <select
          value={selected}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          style={baseStyle}
        >
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }
    default:
      return null;
  }
}
