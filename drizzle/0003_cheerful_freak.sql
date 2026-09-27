CREATE TABLE `publication_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`contentType` enum('image','video','publication','all') NOT NULL DEFAULT 'all',
	`platform` varchar(80) NOT NULL DEFAULT 'Instagram',
	`tone` varchar(80) DEFAULT 'Cercano y claro',
	`captionTemplate` text,
	`hashtags` text,
	`videoQuality` enum('original','1080p','720p','480p') NOT NULL DEFAULT '1080p',
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `publication_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `content_items` ADD `profileId` int;