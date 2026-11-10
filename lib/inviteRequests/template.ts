// The message sent to a member whose invite request is turned down. Admins
// can replace it from fribot's Home tab; this is used until they do.
export const DEFAULT_REJECTION_TEMPLATE = `Hej [[INBJUDARE]]!

Tack för att du vill bjuda in [[INBJUDNA]] till Frilansare Sverige. Vi tar bara in nya medlemmar via formuläret på [[ANSOKAN_URL]], eftersom det krävs att man har ett företag att fakturera genom och har tecknat avtal med sin första kund.

Din inbjudan kommer därför att nekas. Skicka gärna länken till formuläret till den du ville bjuda in i stället!`

export const MAX_TEMPLATE_LENGTH = 3000

export const placeholders = {
  INBJUDARE: 'den som skickade inbjudan, som en @-omnämning',
  INBJUDNA: 'e-postadressen eller -adresserna som skulle bjudas in',
  ANSOKAN_URL: 'länken till ansökningsformuläret',
} as const

type Placeholder = keyof typeof placeholders

export const renderRejection = (
  template: string,
  values: { inviterId: string; invitees: string[]; applicationUrl: string },
) => {
  const replacements: Record<Placeholder, string> = {
    INBJUDARE: `<@${values.inviterId}>`,
    INBJUDNA: values.invitees.join(', '),
    ANSOKAN_URL: values.applicationUrl,
  }

  return template.replace(/\[\[([A-Z_]+)\]\]/g, (match, key: string) =>
    key in replacements ? replacements[key as Placeholder] : match,
  )
}

export const unknownPlaceholders = (template: string) => [
  ...new Set(
    Array.from(template.matchAll(/\[\[([A-Z_]+)\]\]/g), (m) => m[1]!).filter(
      (key) => !(key in placeholders),
    ),
  ),
]
