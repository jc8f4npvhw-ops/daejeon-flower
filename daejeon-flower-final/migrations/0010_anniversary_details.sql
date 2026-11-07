-- Optional details for button-based registration. Existing records remain intact.
ALTER TABLE anniversary_reminders ADD COLUMN relationship TEXT;
ALTER TABLE anniversary_reminders ADD COLUMN occasion TEXT;
ALTER TABLE anniversary_reminders ADD COLUMN memo TEXT NOT NULL DEFAULT '';
ALTER TABLE anniversary_reminders ADD COLUMN start_date TEXT;
