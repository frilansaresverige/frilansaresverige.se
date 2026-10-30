// Mirrors the existing production tables (see structure.sql in the old uppdrag
// repository). This file only describes them; nothing here alters the database.
import {
  bigint,
  boolean,
  foreignKey,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  varchar,
} from 'drizzle-orm/mysql-core'

import { senderTypes } from '@/lib/assignmentFields'

// Timestamps are Unix seconds.
const timestamp = (name: string) => bigint(name, { mode: 'number' })

export const assignment = mysqlTable('assignment', {
  id: varchar('id', { length: 255 }).primaryKey(),
  senderType: mysqlEnum('senderType', senderTypes).notNull(),
  emailAddress: varchar('emailAddress', { length: 255 }).notNull(),
  customerName: varchar('customerName', { length: 255 }).notNull(),
  customerOrganizationNumber: varchar('customerOrganizationNumber', {
    length: 15,
  }),
  customerFee: varchar('customerFee', { length: 50 }),
  clientHourlyRate: varchar('clientHourlyRate', { length: 20 }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  contact: text('contact').notNull(),
  created: timestamp('created').notNull(),
  // A channel name such as #uppdrag, taken from the configuration at the time.
  slackChannel: varchar('slackChannel', { length: 255 }).notNull(),
  // Timestamp of the initial Slack message, which doubles as its thread id.
  slackId: varchar('slackId', { length: 255 }),
  location: varchar('location', { length: 255 }),
  slackThreadId: varchar('slackThreadId', { length: 255 }),
  // The channel id Slack resolved slackChannel to; chat.update requires it.
  slackChannelId: varchar('slackChannelId', { length: 255 }),
  deleted: timestamp('deleted'),
  slackDeleted: boolean('slackDeleted').notNull().default(false),
})

export const assignmentComment = mysqlTable(
  'assignmentComment',
  {
    assignment: varchar('assignment', { length: 255 }).notNull(),
    // Sequence number within the assignment, starting at 1.
    id: int('id').notNull(),
    comment: text('comment').notNull(),
    created: timestamp('created').notNull(),
    slackId: varchar('slackId', { length: 255 }),
  },
  (table) => [
    primaryKey({ columns: [table.assignment, table.id] }),
    foreignKey({
      name: 'assignmentComment_ibfk_1',
      columns: [table.assignment],
      foreignColumns: [assignment.id],
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
  ],
)

export type Assignment = typeof assignment.$inferSelect
export type AssignmentComment = typeof assignmentComment.$inferSelect
