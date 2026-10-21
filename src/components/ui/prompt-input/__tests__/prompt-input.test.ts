import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PromptInput from '../PromptInput.vue'

function setup(props: Record<string, unknown> = {}, value = '') {
  const wrapper = mount(PromptInput, {
    props: { modelValue: value, 'onUpdate:modelValue': (v: string | undefined) => wrapper.setProps({ modelValue: v }), ...props },
  })
  return wrapper
}

describe('PromptInput', () => {
  it('supports v-model', async () => {
    const wrapper = setup()
    await wrapper.get('input').setValue('hello')
    expect(wrapper.props('modelValue')).toBe('hello')
  })

  it('sends the trimmed text on Enter', async () => {
    const wrapper = setup({}, '  why this order?  ')
    await wrapper.get('input').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('send')).toEqual([['why this order?']])
  })

  it('sends from the SEND button', async () => {
    const wrapper = setup({}, 'hi')
    await wrapper.get('[data-slot="prompt-input-send"]').trigger('click')
    expect(wrapper.emitted('send')).toEqual([['hi']])
  })

  it('does not send empty or whitespace-only input', async () => {
    const wrapper = setup({}, '   ')
    await wrapper.get('input').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('send')).toBeUndefined()
    expect(wrapper.get('[data-slot="prompt-input-send"]').attributes('disabled')).toBeDefined()
  })

  it('does not send while an IME is composing', async () => {
    const wrapper = setup({}, 'こん')
    await wrapper.get('input').trigger('keydown', { key: 'Enter', isComposing: true })
    expect(wrapper.emitted('send')).toBeUndefined()
  })

  it('does not send on Enter while busy, and offers STOP instead', async () => {
    const wrapper = setup({ busy: true }, 'next question')
    await wrapper.get('input').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('send')).toBeUndefined()
    expect(wrapper.find('[data-slot="prompt-input-send"]').exists()).toBe(false)
  })

  it('emits stop from the STOP button', async () => {
    const wrapper = setup({ busy: true })
    await wrapper.get('[data-slot="prompt-input-stop"]').trigger('click')
    expect(wrapper.emitted('stop')).toHaveLength(1)
  })

  it('does not send when disabled', async () => {
    const wrapper = setup({ disabled: true }, 'text')
    await wrapper.get('input').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('send')).toBeUndefined()
  })

  it('names the input and ties the hint to it', () => {
    const wrapper = setup({ placeholder: 'Ask…', label: 'Your question', hint: 'model · key' })
    const input = wrapper.get('input')
    expect(input.attributes('aria-label')).toBe('Your question')
    expect(input.attributes('placeholder')).toBe('Ask…')
    const hint = wrapper.get('p')
    expect(input.attributes('aria-describedby')).toBe(hint.attributes('id'))
  })
})
