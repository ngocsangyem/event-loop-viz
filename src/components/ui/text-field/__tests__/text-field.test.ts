import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TextField from '../TextField.vue'

describe('TextField', () => {
  it('links the label to the input and forwards attrs to the input', () => {
    const wrapper = mount(TextField, { props: { label: 'Key' }, attrs: { 'data-testid': 'key', autocomplete: 'off' } })
    const input = wrapper.get('input')
    expect(wrapper.get('label').attributes('for')).toBe(input.attributes('id'))
    expect(input.attributes('data-testid')).toBe('key')
    expect(input.attributes('autocomplete')).toBe('off')
    expect(wrapper.attributes('data-testid')).toBeUndefined()
  })

  it('supports v-model both ways', async () => {
    const wrapper = mount(TextField, { props: { modelValue: 'a', 'onUpdate:modelValue': (v: string | undefined) => wrapper.setProps({ modelValue: v }) } })
    expect(wrapper.get('input').element.value).toBe('a')
    await wrapper.get('input').setValue('abc')
    expect(wrapper.props('modelValue')).toBe('abc')
  })

  it('uses the given input type', () => {
    expect(mount(TextField, { props: { type: 'password' } }).get('input').attributes('type')).toBe('password')
  })

  it('emits action from the action button only when one is configured', async () => {
    const without = mount(TextField)
    expect(without.find('button').exists()).toBe(false)
    const wrapper = mount(TextField, { props: { action: 'Show' } })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('action')).toHaveLength(1)
    expect(wrapper.get('button').text()).toBe('Show')
  })

  it('marks the input invalid and announces the error', () => {
    const wrapper = mount(TextField, { props: { error: '401 — key rejected', helper: 'Stored only here' } })
    const input = wrapper.get('input')
    expect(input.attributes('aria-invalid')).toBe('true')
    const alert = wrapper.get('[role="alert"]')
    expect(alert.text()).toContain('401 — key rejected')
    const described = input.attributes('aria-describedby')!.split(' ')
    expect(described).toContain(alert.attributes('id'))
    expect(described).toHaveLength(2)
    expect(wrapper.get('[data-slot="text-field-box"]').attributes('data-invalid')).toBe('')
  })

  it('has no error semantics when valid', () => {
    const wrapper = mount(TextField, { props: { helper: 'hint' } })
    expect(wrapper.get('input').attributes('aria-invalid')).toBeUndefined()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('disables the input and the action', () => {
    const wrapper = mount(TextField, { props: { disabled: true, action: 'Show' } })
    expect(wrapper.get('input').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })
})
