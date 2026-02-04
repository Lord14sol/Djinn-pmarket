-- Add outcome_colors array column to markets table to support Neo-Brutalist color picker
ALTER TABLE markets 
ADD COLUMN IF NOT EXISTS outcome_colors text[] DEFAULT '{}';
