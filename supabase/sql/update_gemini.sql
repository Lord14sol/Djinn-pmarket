UPDATE oracle_sources SET config = jsonb_set(config, '{api_key}', '"AIzaSyBnBXuHTo3XikfQbL3QpXmerKfSjOAv-gM"'), enabled = true WHERE name = 'gemini';
