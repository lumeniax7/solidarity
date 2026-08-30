CREATE TABLE `announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`createdBy` int NOT NULL,
	`publishedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action` varchar(40) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` int,
	`oldValue` text,
	`newValue` text,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cash_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`direction` enum('IN','OUT') NOT NULL,
	`sourceType` varchar(40) NOT NULL,
	`sourceId` int,
	`amount` int NOT NULL,
	`transactionDate` timestamp NOT NULL,
	`description` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cash_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(160) NOT NULL,
	`phone` varchar(40),
	`email` varchar(320),
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`isActive` int NOT NULL DEFAULT 1,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_allocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paymentTransactionId` int NOT NULL,
	`memberId` int NOT NULL,
	`monthKey` varchar(7) NOT NULL,
	`amount` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_allocations_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_allocation_transaction_month_unique` UNIQUE(`paymentTransactionId`,`monthKey`)
);
--> statement-breakpoint
CREATE TABLE `payment_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`paymentDate` timestamp NOT NULL,
	`amount` int NOT NULL,
	`paymentMethod` varchar(40) NOT NULL DEFAULT 'ESPECES',
	`reference` varchar(120),
	`observation` text,
	`recordedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(80) NOT NULL,
	`value` varchar(255) NOT NULL,
	`updatedBy` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
CREATE TABLE `withdrawals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`withdrawalDate` timestamp NOT NULL,
	`amount` int NOT NULL,
	`category` enum('SANTE','URGENCE','DECES','EDUCATION','EVENEMENT_FAMILIAL','AIDE_FAMILIALE','DEPLACEMENT','AUTRE') NOT NULL,
	`beneficiary` varchar(160),
	`motif` varchar(255) NOT NULL,
	`description` text,
	`paymentMethod` varchar(40) NOT NULL DEFAULT 'ESPECES',
	`reference` varchar(120),
	`observation` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `withdrawals_id` PRIMARY KEY(`id`)
);
