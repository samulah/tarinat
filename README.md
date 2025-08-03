# 📚 Tarinat - Jakosivusto

Tarina-jakosivusto, jossa käyttäjät voivat jakaa tarinoita ja kommentoida niitä.

## ✨ Ominaisuudet

- 📝 **Tarinan jakaminen**: Käyttäjät voivat jakaa tarinoita nimikkeellä, kuvalla ja tekstillä
- 💬 **Kommentointi**: Tarinoihin voi kommentoida nimikkeellä, kuvalla ja tekstillä
- 🗳️ **Äänestys**: Tarinoita voi äänestää "pakinaksi" tai "tarinaksi"
- 🔢 **Numerointi**: Tarinat ja kommentit saavat juoksevat numerot (1, 2, 3...)
- 📱 **Responsiivinen**: Toimii hyvin mobiililaitteilla ja työpöydällä

## 🛠️ Teknologia

- **Backend**: Node.js + Express.js
- **Tietokanta**: MongoDB + Mongoose
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Tiedostojen käsittely**: Multer (kuvien tallennukselle)

## 📋 Vaatimukset

- Node.js (versio 14 tai uudempi)
- MongoDB (paikallinen tai pilvipalvelu kuten MongoDB Atlas)

## 🏠 Asustor NAS -asennus

### Vaihe 1: Tarkista järjestelmä
```bash
# Tarkista arkkitehtuuri
uname -m
# Vastaus voi olla: x86_64, aarch64, armv7l
```

### Vaihe 2: Asenna Node.js
```bash
# Mene kotihakemistoon
cd /volume1/homes/admin

# Lataa Node.js (valitse arkkitehtuurin mukaan):

# Jos x86_64:
wget https://nodejs.org/dist/v18.17.1/node-v18.17.1-linux-x64.tar.xz
tar -xf node-v18.17.1-linux-x64.tar.xz
mv node-v18.17.1-linux-x64 nodejs

# Jos aarch64/arm64:
wget https://nodejs.org/dist/v18.17.1/node-v18.17.1-linux-arm64.tar.xz
tar -xf node-v18.17.1-linux-arm64.tar.xz
mv node-v18.17.1-linux-arm64 nodejs

# Jos armv7l:
wget https://nodejs.org/dist/v18.17.1/node-v18.17.1-linux-armv7l.tar.xz
tar -xf node-v18.17.1-linux-armv7l.tar.xz
mv node-v18.17.1-linux-armv7l nodejs
```

### Vaihe 3: Lisää PATH
```bash
# Lisää Node.js PATH:iin
export PATH=$PATH:/volume1/homes/admin/nodejs/bin

# Tee muutos pysyväksi
echo 'export PATH=$PATH:/volume1/homes/admin/nodejs/bin' >> ~/.bashrc
source ~/.bashrc

# Testaa että toimii
node --version
npm --version
```

### Vaihe 4: Asenna MongoDB
```bash
# Mene kotihakemistoon
cd /volume1/homes/admin

# Lataa MongoDB Community Server (valitse arkkitehtuurin mukaan):

# Jos x86_64:
wget https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu2004-7.0.4.tgz
tar -xzf mongodb-linux-x86_64-ubuntu2004-7.0.4.tgz
mv mongodb-linux-x86_64-ubuntu2004-7.0.4 mongodb

# Jos aarch64/arm64:
wget https://fastdl.mongodb.org/linux/mongodb-linux-aarch64-ubuntu2004-7.0.4.tgz
tar -xzf mongodb-linux-aarch64-ubuntu2004-7.0.4.tgz
mv mongodb-linux-aarch64-ubuntu2004-7.0.4 mongodb

# Luo tarvittavat hakemistot
mkdir -p /volume1/homes/admin/mongodb-data
mkdir -p /volume1/homes/admin/mongodb-logs

# Lisää MongoDB PATH:iin
export PATH=$PATH:/volume1/homes/admin/mongodb/bin
echo 'export PATH=$PATH:/volume1/homes/admin/mongodb/bin' >> ~/.bashrc
```

### Vaihe 5: Käynnistä MongoDB
```bash
# Käynnistä MongoDB taustalla
mongod --dbpath /volume1/homes/admin/mongodb-data --logpath /volume1/homes/admin/mongodb-logs/mongod.log --fork

# Testaa yhteys
mongo --eval "db.runCommand('ping')"

# Jos haluat pysäyttää MongoDB:n:
# mongod --dbpath /volume1/homes/admin/mongodb-data --shutdown
```

### Vaihe 6: Luo projekti
```bash
# Luo projektikansio
mkdir /volume1/homes/admin/tarinat-projekti
cd /volume1/homes/admin/tarinat-projekti

# Kopioi projektitiedostot tänne (SFTP, File Manager, etc.)
```

### Vaihe 7: Konfiguroi paikallinen MongoDB
```bash
# Mene server-hakemistoon
cd /volume1/homes/admin/tarinat-projekti/server

# Luo .env-tiedosto paikallista MongoDB:tä varten
echo 'MONGODB_URI=mongodb://localhost:27017/tarinat' > .env
echo 'PORT=3000' >> .env
```

### Vaihe 8: Asenna riippuvuudet ja käynnistä
```bash
# Varmista että MongoDB on käynnissä
mongod --dbpath /volume1/homes/admin/mongodb-data --logpath /volume1/homes/admin/mongodb-logs/mongod.log --fork

# Asenna riippuvuudet
npm install

# Käynnistä sovellus
npm start

# Sovellus pyörii nyt: http://ASUSTOR-IP:3000
```

## 🔄 MongoDB hallinta Asustorissa

### Käynnistä MongoDB
```bash
mongod --dbpath /volume1/homes/admin/mongodb-data --logpath /volume1/homes/admin/mongodb-logs/mongod.log --fork
```

### Pysäytä MongoDB
```bash
mongod --dbpath /volume1/homes/admin/mongodb-data --shutdown
```

### Tarkista MongoDB:n tila
```bash
# Testaa yhteys
mongo --eval "db.runCommand('ping')"

# Katso MongoDB:n prosessi
ps aux | grep mongod
```

### MongoDB automaattinen käynnistys (valinnainen)
Luo käynnistysscripti:
```bash
# Luo scripti
cat > /volume1/homes/admin/start-mongodb.sh << 'EOF'
#!/bin/bash
export PATH=$PATH:/volume1/homes/admin/mongodb/bin
mongod --dbpath /volume1/homes/admin/mongodb-data --logpath /volume1/homes/admin/mongodb-logs/mongod.log --fork
EOF

# Tee suoritettavaksi
chmod +x /volume1/homes/admin/start-mongodb.sh

# Käynnistä MongoDB
./start-mongodb.sh
```

## 🚀 Asennus ja käynnistys

1. **Kloonaa repositorio** (tai lataa projektikansio)

2. **Asenna riippuvuudet**:
   ```bash
   # Asenna backend-riippuvuudet
   npm run install-server
   
   # TAI vaihtoehtoisesti
   cd server && npm install
   ```

3. **Konfiguroi ympäristömuuttujat**:
   - Muokkaa `server/.env`-tiedostoa tarvittaessa
   - Paikallinen MongoDB: `MONGODB_URI=mongodb://localhost:27017/tarinat`
   - MongoDB Atlas: `MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tarinat`

4. **Varmista että MongoDB on käynnissä**:
   - Paikallinen: `mongod`
   - Pilvipalvelu: Ei tarvitse tehdä mitään

5. **Käynnistä sovellus**:
   ```bash
   # Käynnistä juurihakemistosta
   npm start
   
   # TAI käynnistä server-hakemistosta
   cd server && npm start
   ```

6. **Avaa selaimessa**: `http://localhost:3000`

## 📁 Projektirakenteen

```
tarinat-projekti/
├── server/                # Backend-palvelin
│   ├── server.js          # Express-palvelin ja API-reitit
│   ├── package.json       # Backend riippuvuudet
│   ├── .env               # Ympäristömuuttujat
│   └── uploads/           # Ladatut kuvat
├── client/                # Frontend-asiakasohjelma
│   ├── index.html         # Pääsivu
│   ├── admin.html         # Admin-sivu
│   ├── tarina.html        # Yksittäisen tarinan sivu
│   ├── styles.css         # Tyylitiedosto
│   ├── script.js          # Pääsivun JavaScript
│   ├── tarina.js          # Tarinan JavaScript
│   └── package.json       # Frontend konfiguraatio
├── package.json           # Projektin pääkonfiguraatio
├── .gitignore             # Git-sivuutustiedosto
└── README.md              # Tämä tiedosto
```

## 🌐 API-reitit

- `GET /api/tarinat` - Hae kaikki tarinat
- `POST /api/tarinat` - Luo uusi tarina
- `GET /api/tarinat/:id/kommentit` - Hae tarinan kommentit
- `POST /api/tarinat/:id/kommentit` - Lisää kommentti tarinaan
- `POST /api/tarinat/:id/aanesta` - Äänestä tarinaa

## 🔧 Tuotantoon vienti

### MongoDB Atlas (suositeltu)

1. Luo tili [MongoDB Atlas](https://www.mongodb.com/atlas):ssa
2. Luo uusi klustere
3. Luo tietokanta-käyttäjä
4. Päivitä `.env`-tiedosto Atlas-yhteysmerkkijonolla

### Palvelinympäristöt

**Heroku**:
```bash
# Asenna Heroku CLI
heroku create tarinat-app
heroku config:set MONGODB_URI="your-atlas-connection-string"
git push heroku main
```

**Render/Railway/Vercel**:
- Yhdistä GitHub-repositorio
- Määritä ympäristömuuttujat
- Käynnistyskomen: `npm start`

## 📝 Käyttöohjeet

1. **Tarinan lisäys**:
   - Kirjoita nimimerkki (valinnainen, oletus: "anonyymi")
   - Lataa kuva (pakollinen)
   - Kirjoita tarinan teksti (pakollinen)
   - Klikkaa "Julkaise tarina"

2. **Kommentointi**:
   - Klikkaa "Kommentoi"-nappia tarinan alapuolella
   - Täytä lomake samalla tavalla kuin tarinan lisäyksessä
   - Klikkaa "Lisää kommentti"

3. **Äänestys**:
   - Klikkaa "😄 Pakina" tai "📖 Tarina" -nappia
   - Äänet näkyvät nappien vieressä

## 🤝 Kehitys

Kehitysmoodia varten voit käyttää:
```bash
npm run dev
```

## 📄 Lisenssi

ISC License

## 🆘 Tuki

Jos kohtaat ongelmia:
1. Tarkista että MongoDB on käynnissä
2. Varmista että kaikki riippuvuudet on asennettu (`npm install`)
3. Tarkista `.env`-tiedoston asetukset
4. Katso konsolista virheviestejä
