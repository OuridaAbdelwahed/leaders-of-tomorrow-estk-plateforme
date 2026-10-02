-- Imported historical member records may not include private contact details.
-- Keep those values unknown instead of inventing addresses that could be mistaken
-- for real login credentials.
ALTER TABLE members MODIFY email VARCHAR(190) NULL;
