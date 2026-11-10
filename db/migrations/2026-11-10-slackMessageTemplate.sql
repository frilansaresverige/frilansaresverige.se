-- Message templates that Slack admins can edit through the bot, starting with
-- the reply to members whose invite requests are turned down. Run once against
-- the uppdrag database before deploying the invite request bot.
CREATE TABLE IF NOT EXISTS `slackMessageTemplate` (
  `name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated` bigint NOT NULL,
  `updatedBy` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
