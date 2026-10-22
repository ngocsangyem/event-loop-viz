import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { i18n } from '@/i18n'
import DrivePopover from '../drive-popover.vue'

const make = (index: number, total = 3) =>
  mount(DrivePopover, { props: { index, total, title: 'The timer fires', body: 'Its Task runs.' }, global: { plugins: [i18n] } })

describe('DrivePopover', () => {
  it('prints padded progress, the title and the body', () => {
    const wrapper = make(1, 7)
    expect(wrapper.get('[data-testid="drive-progress"]').text()).toBe('Step 02 of 07')
    expect(wrapper.get('h2').text()).toBe('The timer fires')
    expect(wrapper.text()).toContain('Its Task runs.')
  })

  it('disables Prev on the first step and ends from the last one', async () => {
    const first = make(0)
    expect(first.get('[data-testid="drive-prev"]').attributes('disabled')).toBeDefined()
    const last = make(2)
    await last.get('[data-testid="drive-next"]').trigger('click')
    expect(last.emitted('end')).toHaveLength(1)
    expect(last.emitted('next')).toBeUndefined()
  })

  it('ends on Escape', async () => {
    const wrapper = make(1)
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('end')).toHaveLength(1)
  })
})
