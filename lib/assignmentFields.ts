// Shared by the form in the browser and the validation on the server, so this
// module must stay free of server-side dependencies.
export const senderTypes = ['DIRECT', 'BROKER'] as const
export type SenderType = (typeof senderTypes)[number]

// Limits follow the form; the database columns allow at least this much.
export const limits = {
  title: 50,
  location: 50,
  customerName: 50,
  customerOrganizationNumber: 15,
  customerFee: 50,
  emailAddress: 50,
  // TEXT columns hold 64 KiB; four bytes per character leaves some margin.
  longText: 15_000,
}
