// Mirrors the existing production tables (see structure.sql in the old uppdrag
// repository). This file only describes them; nothing here alters the database.
import {
  bigint,
  boolean,
  foreignKey,
  index,
  int,
  json,
  mediumtext,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  serial,
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

// Added for the invite request bot. Message templates that Slack admins can
// edit, keyed by name; see db/migrations.
export const slackMessageTemplate = mysqlTable('slackMessageTemplate', {
  name: varchar('name', { length: 64 }).primaryKey(),
  body: text('body').notNull(),
  updated: timestamp('updated').notNull(),
  // Slack user id of the admin who last changed it.
  updatedBy: varchar('updatedBy', { length: 255 }).notNull(),
})

// The archive of the public Slack channels; see
// db/migrations/2026-11-18-slackArchive.sql for what each column holds.
const slackId = (name: string) => varchar(name, { length: 32 })

export const slackChannel = mysqlTable('slackChannel', {
  id: slackId('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  topic: text('topic'),
  purpose: text('purpose'),
  created: timestamp('created').notNull(),
  creatorId: slackId('creatorId'),
  memberCount: int('memberCount'),
  isArchived: boolean('isArchived').notNull().default(false),
  isMember: boolean('isMember').notNull().default(false),
  deleted: timestamp('deleted'),
  backfilled: timestamp('backfilled'),
  updated: timestamp('updated').notNull(),
  raw: json('raw').notNull(),
})

export const slackUser = mysqlTable('slackUser', {
  id: slackId('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  realName: varchar('realName', { length: 255 }),
  displayName: varchar('displayName', { length: 255 }),
  title: varchar('title', { length: 255 }),
  avatarUrl: varchar('avatarUrl', { length: 1024 }),
  timezone: varchar('timezone', { length: 64 }),
  isBot: boolean('isBot').notNull().default(false),
  isDeleted: boolean('isDeleted').notNull().default(false),
  updated: timestamp('updated').notNull(),
  raw: json('raw').notNull(),
})

export const slackMessage = mysqlTable(
  'slackMessage',
  {
    channelId: slackId('channelId').notNull(),
    ts: slackId('ts').notNull(),
    threadTs: slackId('threadTs'),
    userId: slackId('userId'),
    botId: slackId('botId'),
    username: varchar('username', { length: 255 }),
    subtype: varchar('subtype', { length: 64 }),
    text: mediumtext('text').notNull(),
    posted: timestamp('posted').notNull(),
    edited: slackId('edited'),
    replyCount: int('replyCount').notNull().default(0),
    deleted: timestamp('deleted'),
    updated: timestamp('updated').notNull(),
    raw: json('raw'),
  },
  (table) => [
    primaryKey({ columns: [table.channelId, table.ts] }),
    index('slackMessage_thread').on(table.channelId, table.threadTs),
    index('slackMessage_user').on(table.userId),
    index('slackMessage_posted').on(table.posted),
  ],
)

export const slackMessageRevision = mysqlTable(
  'slackMessageRevision',
  {
    id: serial('id').primaryKey(),
    channelId: slackId('channelId').notNull(),
    ts: slackId('ts').notNull(),
    reason: mysqlEnum('reason', ['edited', 'deleted']).notNull(),
    replaced: timestamp('replaced').notNull(),
    text: mediumtext('text').notNull(),
    edited: slackId('edited'),
    raw: json('raw'),
  },
  (table) => [
    index('slackMessageRevision_message').on(table.channelId, table.ts),
  ],
)

export const slackFile = mysqlTable(
  'slackFile',
  {
    id: slackId('id').primaryKey(),
    channelId: slackId('channelId').notNull(),
    messageTs: slackId('messageTs').notNull(),
    userId: slackId('userId'),
    name: varchar('name', { length: 1024 }),
    title: varchar('title', { length: 1024 }),
    mimetype: varchar('mimetype', { length: 255 }),
    filetype: varchar('filetype', { length: 64 }),
    size: bigint('size', { mode: 'number' }),
    created: timestamp('created'),
    path: varchar('path', { length: 1024 }),
    downloaded: timestamp('downloaded'),
    attempts: int('attempts').notNull().default(0),
    lastError: varchar('lastError', { length: 1024 }),
    updated: timestamp('updated').notNull(),
    raw: json('raw').notNull(),
  },
  (table) => [
    index('slackFile_message').on(table.channelId, table.messageTs),
    index('slackFile_pending').on(table.downloaded, table.attempts),
  ],
)

export type SlackMessageRow = typeof slackMessage.$inferSelect
