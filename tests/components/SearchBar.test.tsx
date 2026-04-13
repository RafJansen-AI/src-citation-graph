import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchBar } from '../../src/components/SearchBar'
import { useAppStore } from '../../src/store/appStore'

afterEach(() => { useAppStore.setState({ searchQuery: '' }) })

describe('SearchBar', () => {
  it('does not update the store synchronously on every keystroke', async () => {
    const user = userEvent.setup()
    render(<SearchBar focusAreas={[]} focusAreaColors={{}} />)

    const input = screen.getByPlaceholderText('Filter papers or authors…')
    await user.type(input, 'a')

    // Immediately after typing one char, store should still be empty (debounce not fired)
    expect(useAppStore.getState().searchQuery).toBe('')

    // After debounce fires, store should be updated
    await waitFor(() => {
      expect(useAppStore.getState().searchQuery).toBe('a')
    }, { timeout: 1000 })
  })

  it('renders focus area legend entries', () => {
    render(
      <SearchBar
        focusAreas={['Environmental science', 'Other']}
        focusAreaColors={{ 'Environmental science': '#16A34A', 'Other': '#6B7280' }}
      />
    )
    expect(screen.getByText('Environmental science')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
  })
})
