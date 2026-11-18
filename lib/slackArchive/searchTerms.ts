// Splits a search into terms: words, or "phrases in quotes". Every term must
// occur in a message for it to match.
const MAX_TERMS = 8

export const parseSearchTerms = (query: string) => {
  const terms: string[] = []

  for (const [, phrase, word] of query.matchAll(/"([^"]+)"|(\S+)/g)) {
    const term = (phrase ?? word ?? '').trim()
    if (term.length >= 2 && !terms.includes(term)) {
      terms.push(term)
    }
  }

  return terms.slice(0, MAX_TERMS)
}
