-- NUCLEAR RESET: Resetear TODOS los usernames a sus wallet_address
-- Esto libera TODOS los nombres custom para empezar de cero

UPDATE profiles
SET username = wallet_address;

-- Ahora todos los nombres están libres para ser reclamados
