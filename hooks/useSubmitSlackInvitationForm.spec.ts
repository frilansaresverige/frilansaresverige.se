import { renderHook, act } from '@testing-library/react-hooks'
import { FormEvent } from 'react'
import { useSubmitSlackInvitationForm } from './useSubmitSlackInvitationForm'

const mockFetchPromise = ({
  success,
  reject = false,
}: {
  success?: boolean
  reject?: boolean
}) => {
  if (!reject) {
    global.fetch = jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve({ json: () => Promise.resolve({ success }) })
      )
  } else {
    global.fetch = jest
      .fn()
      .mockImplementation(() => Promise.reject(new Error('ooops')))
  }
}

const createMockFormEvent = (data: Record<string, { value: string }> = {}) => ({
  preventDefault: () => {},
  target: {
    name: { value: 'name' },
    email: { value: 'mail' },
    howlong: { value: 'howlong' },
    companyName: { value: 'companyName' },
    linkedin: { value: 'linkedin' },
    motivation: { value: 'motivation' },
    ...data,
  },
})

const forceType = <T>(input: unknown) => input as T

describe('useSubmitSlackInvitationForm', () => {
  afterAll(() => {
    jest.clearAllMocks()
  })
  it('should render with default values', () => {
    const { result } = renderHook(() => useSubmitSlackInvitationForm())
    expect(result.current).toEqual({
      submitForm: expect.any(Function),
      data: null,
      error: null,
      isLoading: false,
    })
  })

  it('should handle successful submission', async () => {
    mockFetchPromise({ success: true })
    const mockedFormEvent = createMockFormEvent()
    const { result } = renderHook(() => useSubmitSlackInvitationForm())
    expect(result.current.data).toBe(null)

    await act(async () => {
      await result.current.submitForm(forceType<FormEvent>(mockedFormEvent))
    })
    expect(result.current.data?.success).toBe(true)
  })
  it('should handle submission failure', async () => {
    mockFetchPromise({ success: false })
    const mockedFormEvent = createMockFormEvent()
    const { result } = renderHook(() => useSubmitSlackInvitationForm())
    expect(result.current.data).toBe(null)

    await act(async () => {
      await result.current.submitForm(forceType<FormEvent>(mockedFormEvent))
    })
    expect(result.current.data?.success).toBe(false)
  })
  it('should handle submission error', async () => {
    mockFetchPromise({ reject: true })
    const mockedFormEvent = createMockFormEvent()
    const { result } = renderHook(() => useSubmitSlackInvitationForm())
    expect(result.current.data).toBe(null)
    expect(result.current.error).toBe(null)

    await act(async () => {
      await result.current.submitForm(forceType<FormEvent>(mockedFormEvent))
    })
    expect(result.current.data?.success).toBe(undefined)
    expect(result.current.error).toBeUndefined()
    expect(result.current.error).toEqual(new Error('ooops'))
  })
})
