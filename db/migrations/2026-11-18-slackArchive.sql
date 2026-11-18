-- The archive of the Slack workspace's public channels, which fribot keeps so
-- that discussions outlive the Free plan's 90 days of history. Run once
-- against the uppdrag database before deploying the archive.
--
-- Slack's own ids and timestamps are stored as given (a message is identified
-- by its channel and its ts, e.g. 1794390082.113099). Times we set ourselves
-- are Unix seconds, like the rest of the database. `raw` keeps Slack's whole
-- object, so nothing has to be fetched again to use a field later.

CREATE TABLE IF NOT EXISTS `slackChannel` (
  `id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `topic` text COLLATE utf8mb4_unicode_ci,
  `purpose` text COLLATE utf8mb4_unicode_ci,
  `created` bigint NOT NULL,
  `creatorId` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `memberCount` int DEFAULT NULL,
  `isArchived` tinyint(1) NOT NULL DEFAULT 0,
  -- Whether fribot is in the channel, and so receives its messages.
  `isMember` tinyint(1) NOT NULL DEFAULT 0,
  -- When the channel was deleted in Slack; its messages are kept.
  `deleted` bigint DEFAULT NULL,
  -- When the history Slack still had was fetched, after fribot joined.
  `backfilled` bigint DEFAULT NULL,
  `updated` bigint NOT NULL,
  `raw` json NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `slackUser` (
  `id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `realName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `displayName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatarUrl` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timezone` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isBot` tinyint(1) NOT NULL DEFAULT 0,
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0,
  `updated` bigint NOT NULL,
  `raw` json NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The current version of every message, thread replies included. A deleted
-- message keeps its row, marked deleted and emptied; what it said is in
-- slackMessageRevision.
CREATE TABLE IF NOT EXISTS `slackMessage` (
  `channelId` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `ts` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  -- The thread's first message, for replies and for a thread's first message
  -- itself; NULL for messages without replies.
  `threadTs` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `userId` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `botId` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subtype` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `text` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  -- When it was posted, from ts.
  `posted` bigint NOT NULL,
  -- Slack's edited.ts, when the message has been edited.
  `edited` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `replyCount` int NOT NULL DEFAULT 0,
  `deleted` bigint DEFAULT NULL,
  `updated` bigint NOT NULL,
  `raw` json DEFAULT NULL,
  PRIMARY KEY (`channelId`, `ts`),
  KEY `slackMessage_thread` (`channelId`, `threadTs`),
  KEY `slackMessage_user` (`userId`),
  KEY `slackMessage_posted` (`posted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Earlier versions of edited messages, and the last version of deleted ones.
CREATE TABLE IF NOT EXISTS `slackMessageRevision` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `channelId` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `ts` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `reason` enum('edited','deleted') COLLATE utf8mb4_unicode_ci NOT NULL,
  -- When this version was replaced or deleted.
  `replaced` bigint NOT NULL,
  `text` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `edited` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `raw` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `slackMessageRevision_message` (`channelId`, `ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attachments, downloaded to the archive's volume. A file deleted in Slack is
-- kept, like a deleted message's text.
CREATE TABLE IF NOT EXISTS `slackFile` (
  `id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  -- The message it was first seen in.
  `channelId` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `messageTs` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `userId` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `name` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mimetype` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `filetype` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size` bigint DEFAULT NULL,
  `created` bigint DEFAULT NULL,
  -- Relative to the files directory; NULL until downloaded.
  `path` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `downloaded` bigint DEFAULT NULL,
  `attempts` int NOT NULL DEFAULT 0,
  `lastError` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated` bigint NOT NULL,
  `raw` json NOT NULL,
  PRIMARY KEY (`id`),
  KEY `slackFile_message` (`channelId`, `messageTs`),
  KEY `slackFile_pending` (`downloaded`, `attempts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
