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

## 🚀 Asennus ja käynnistys

1. **Kloonaa repositorio** (tai lataa projektikansio)

2. **Asenna riippuvuudet**:
   ```bash
   npm install
   ```

3. **Konfiguroi ympäristömuuttujat**:
   - Kopioi `.env`-tiedosto ja muokkaa tarvittaessa
   - Paikallinen MongoDB: `MONGODB_URI=mongodb://localhost:27017/tarinat`
   - MongoDB Atlas: `MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tarinat`

4. **Varmista että MongoDB on käynnissä**:
   - Paikallinen: `mongod`
   - Pilvipalvelu: Ei tarvitse tehdä mitään

5. **Käynnistä sovellus**:
   ```bash
   npm start
   ```

6. **Avaa selaimessa**: `http://localhost:3000`

## 📁 Projektirakenteの

```
tarinat-projekti/
├── server.js          # Express-palvelin ja API-reitit
├── package.json       # Projektin riippuvuudet
├── .env               # Ympäristömuuttujat
├── .gitignore         # Git-sivuutustiedosto
├── public/            # Staattiset tiedostot
│   ├── index.html     # Pääsivu
│   ├── styles.css     # Tyylitiedosto
│   └── script.js      # JavaScript-toiminnallisuudet
└── uploads/           # Ladatut kuvat
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
