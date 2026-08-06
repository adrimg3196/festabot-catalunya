-- Guarda l'última ubicació de l'usuari per fer /avui i /capdesetmana
-- "a prop" sense haver d'enviar la ubicació cada vegada (retenció).
-- Ponytail: columna TEXT "lat,lon"; prou per a cercar per proximitat.
ALTER TABLE users ADD COLUMN last_location TEXT;
