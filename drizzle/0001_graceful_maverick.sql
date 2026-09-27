CREATE TABLE `content_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('image','video','note','link','publication') NOT NULL DEFAULT 'note',
	`title` varchar(180) NOT NULL,
	`description` text,
	`body` text,
	`url` text,
	`fileUrl` text,
	`category` varchar(80) DEFAULT 'Sin organizar',
	`tags` text,
	`status` enum('idea','draft','ready','published') NOT NULL DEFAULT 'idea',
	`platform` varchar(80),
	`isFavorite` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_items_id` PRIMARY KEY(`id`)
);
