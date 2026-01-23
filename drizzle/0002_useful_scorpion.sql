CREATE TABLE `learning_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`noteText` text NOT NULL,
	`category` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learning_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practice_problems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`problem` text NOT NULL,
	`solution` text NOT NULL,
	`answer` text NOT NULL,
	`hints` text,
	`difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'medium',
	`isCompleted` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `practice_problems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`question` text NOT NULL,
	`options` text NOT NULL,
	`correctAnswer` varchar(8) NOT NULL,
	`explanation` text,
	`userAnswer` varchar(8),
	`isCorrect` int,
	`difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'medium',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quizzes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session_performance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`totalProblems` int NOT NULL DEFAULT 0,
	`correctAnswers` int NOT NULL DEFAULT 0,
	`currentDifficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'medium',
	`lastActivityAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `session_performance_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_performance_sessionId_unique` UNIQUE(`sessionId`)
);
