CREATE TABLE `share_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(96) NOT NULL,
	`kind` enum('content','collection') NOT NULL,
	`contentId` int,
	`collectionName` varchar(120),
	`title` varchar(180) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `share_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `share_links_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `content_items` ADD `scheduledAt` timestamp;